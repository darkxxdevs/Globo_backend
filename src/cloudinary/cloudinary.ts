import { DeleteApiResponse, v2 as cloud } from "cloudinary"
import { configCredentials } from "./config"

class Cloudinary {
     constructor() {
          cloud.config({
               cloud_name: configCredentials.cloud_name,
               api_key: configCredentials.api_key,
               api_secret: configCredentials.api_secret,
               secure: configCredentials.secure,
          })
     }

     async uploadFile(fileLocalPath: string): Promise<null | string> {
          try {
               if (!fileLocalPath) return null

               const result = await cloud.uploader.upload(fileLocalPath, {
                    resource_type: "image",
                    folder: "globo-assets",
               })
               return result.secure_url
          } catch (error: unknown) {
               throw new Error(`[Cloudinary upload error]: ${error}`)
          }
     }

     async uploadMultiple(files: string[]): Promise<null | string[]> {
          try {
               let uploadResponse: string[] = []
               if (!files || files.length == 0) {
                    return null
               }

               for await (const image of files) {
                    const response = await cloud.uploader.upload(image, {
                         resource_type: "image",
                         folder: "globo-assets",
                    })
                    uploadResponse.push(response.secure_url)
               }

               return uploadResponse
          } catch (error) {
               throw new Error(`[Cloudinary upload error]: ${error}`)
          }
     }

     async deleteFile(publicUrl: string): Promise<null | DeleteApiResponse> {
          try {
               if (!publicUrl) return null

               const result = await cloud.uploader.destroy(publicUrl, {
                    resource_type: "image",
               })
               return result
          } catch (error: unknown) {
               throw new Error(`[Cloudinary delete error]: ${error}`)
          }
     }
}

const cloudinary = new Cloudinary()

export default cloudinary
