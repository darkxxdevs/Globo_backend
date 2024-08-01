import { prisma } from "../lib/prisma.client"
import { Response } from "express"
import { ApiError, ApiResponse, asyncHandler } from "../utils"
import { v4 as uuidv4 } from "uuid"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import signupValidationn from "../utils/validation/signup"
import { ApiRequest } from "../types/ApiRequest"
import { cloudinary } from "../cloudinary"
import loginSchema from "../utils/validation/login"
import { generateTokens } from "../utils/tokens/generate"
import { isPasswordCorrect } from "../utils/password/check"
import { User } from "@prisma/client"
import { env } from "../utils/validation/env.validation"
import { cache } from "../caching/redis"
import { tokenPayload } from "../types"

/* CONSTANTS */
import { COOKIE_OPTIONS, BCRYPT_SALT_ROUNDS } from "../constants/constants"

/* CONTROLLERS */

const registerUser = asyncHandler(
     async (req: ApiRequest, res: Response): Promise<any> => {
          const payload = req.body

          const validationResult = signupValidationn.safeParse(payload)

          if (!validationResult.success)
               throw new ApiError("invalid credentials crdrentials", 400, [
                    { ...validationResult.error, name: "validation error" },
               ])

          const parsedPayload = validationResult.data

          const exisitingUser = await prisma.user.findFirst({
               where: {
                    OR: [
                         { email: parsedPayload.email },
                         { name: parsedPayload.name },
                    ],
               },
          })

          if (exisitingUser)
               throw new ApiError(
                    "User with that given username or email already exists",
                    400
               )

          let uploadResult: (string | null)[] = []

          if (req.files) {
               const fileUpload = []
               if (
                    Array.isArray(req.files.profile) &&
                    req.files.profile.length > 0
               ) {
                    const avatarLocalPath = req.files.profile[0].path
                    fileUpload.push(cloudinary.uploadFile(avatarLocalPath))
               }

               if (
                    Array.isArray(req.files.coverImage) &&
                    req.files.coverImage.length > 0
               ) {
                    const coverImageLocalPath = req.files.coverImage[0].path
                    fileUpload.push(cloudinary.uploadFile(coverImageLocalPath))
               }
               uploadResult = await Promise.all(fileUpload)
          }

          const hashedPassword = await bcrypt.hash(
               parsedPayload.password,
               BCRYPT_SALT_ROUNDS
          )

          const dbTransaction = await prisma.$transaction(async (prisma) => {
               const newUser = await prisma.user.create({
                    data: {
                         id: uuidv4(),
                         name: parsedPayload.name,
                         email: parsedPayload.email,
                         password: hashedPassword,
                         avatar: uploadResult.length > 0 ? uploadResult[0] : "",
                         coverImage:
                              uploadResult.length > 1 ? uploadResult[1] : "",
                    },
               })

               const userPrefrences = await prisma.userPreferences.create({
                    data: {
                         id: uuidv4(),
                         userId: newUser.id,
                    },
               })

               if (!userPrefrences) {
                    throw new ApiError("Error while initializing prefs", 500)
               }

               return newUser
          })

          const newUser = dbTransaction

          const apiResponse = new ApiResponse(201, "User created sucessfully", {
               createdUser: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    avatar: uploadResult.length > 0 ? uploadResult[0] : "",
                    coverImage: uploadResult.length > 1 ? uploadResult[1] : "",
               },
          })

          return res.json(apiResponse)
     }
)

const loginUser = asyncHandler(async (req: ApiRequest, res: Response) => {
     const payload = req.body

     const parsedPayload = loginSchema.safeParse(payload)

     if (!parsedPayload.success) {
          throw new ApiError("invalid credentials", 400, [
               { ...parsedPayload.error, name: "validation error" },
          ])
     }

     const existingUser = await prisma.user.findFirst({
          where: {
               email: parsedPayload.data.email,
          },
     })

     if (!existingUser) {
          throw new ApiError("No user with given email", 404)
     }

     const correctPassword = await isPasswordCorrect(
          existingUser.password,
          parsedPayload.data.password
     )

     if (!correctPassword)
          throw new ApiError("[Authenticatio failed]; incorrect password", 400)

     const { accessToken, refreshToken } = await generateTokens(existingUser.id)

     const loggedInUser = await prisma.user.findUnique({
          where: {
               id: existingUser.id,
          },
          select: {
               id: true,
               name: true,
               email: true,
               avatar: existingUser.avatar ? true : false,
               coverImage: existingUser.coverImage ? true : false,
          },
     })

     return res
          .status(200)
          .cookie("accessToken", accessToken, COOKIE_OPTIONS)
          .cookie("refreshToken", accessToken, COOKIE_OPTIONS)
          .json(
               new ApiResponse(200, "User logged in sucessfully", {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
               })
          )
})

const getCurrentUser = asyncHandler(
     async (req: ApiRequest, res: Response): Promise<any> => {
          const user = req.user as User

          return res.status(200).json(
               new ApiResponse(200, "User fetch success!", {
                    user: {
                         id: user.id,
                         name: user.name,
                         email: user.email,
                         avatar: user.avatar,
                         coverImage: user.coverImage,
                    },
               })
          )
     }
)

const refreshAccessToken = asyncHandler(
     async (req: ApiRequest, res: Response) => {
          const incomingRefreshToken =
               req.cookies.refreshToken || req.body.refreshToken

          if (!incomingRefreshToken) {
               throw new ApiError("RefreshToken not found", 400)
          }

          const cleanedToken = incomingRefreshToken
               .replace(/^Bearer\s/, "")
               .trim()

          const decodedToken = jwt.verify(
               cleanedToken,
               String(env.REFRESH_TOKEN_SECRET)
          ) as tokenPayload

          const cacheKey = `userId:${decodedToken.id}`

          let cacheResult = (await cache.getValue(cacheKey)) as User

          if (!cacheResult) {
               const existingUser = await prisma.user.findUnique({
                    where: {
                         id: decodedToken.id,
                    },
               })

               if (!existingUser) {
                    throw new ApiError("User not found!", 404)
               }

               await cache.setValue(cacheKey, { ...existingUser })

               cacheResult = existingUser
          }

          if (decodedToken.id !== cacheResult.id) {
               throw new ApiError("Token is either used or expired", 400)
          }

          const { accessToken, refreshToken } = await generateTokens(
               decodedToken.id
          )

          return res
               .status(200)
               .cookie("accessToken", accessToken, COOKIE_OPTIONS)
               .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
               .json(
                    new ApiResponse(
                         200,
                         "AccessToken refreshed successfully!",
                         {
                              accessToken,
                              refreshToken,
                         }
                    )
               )
     }
)

const logout = asyncHandler(
     async (_: ApiRequest, res: Response): Promise<any> => {
          return res
               .status(200)
               .clearCookie("accessToken")
               .clearCookie("refreshToken")
               .json(new ApiResponse(200, "User logged out successfully!", {}))
     }
)

export { registerUser, loginUser, getCurrentUser, logout, refreshAccessToken }
