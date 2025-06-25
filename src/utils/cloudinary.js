import {v2 as cloudinary} from "cloudinary"
import { log } from "console";
import fs from "fs"

cloudinary.config({

    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,

    api_secret:process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async (localFilePath)=>{

    try{
        if(!localFilePath) return null
        //uplaod the file
     const resposne= await  cloudinary.uploader.upload(localFilePath,{resource_type:"auto"})
        //file has been uplaoded succesfulll
        // console.log("Uploaded succesfully",resposne.url);
        fs.unlinkSync(localFilePath)
        return resposne;
        

    }catch(err){
        fs.unlinkSync(localFilePath)// remove the locaaly saved temp file as the upload got failed
        return null;

    }
}
export {uploadOnCloudinary}