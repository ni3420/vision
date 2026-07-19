import mongoose from "mongoose"
export const DB=async()=>{
    try {
     return await mongoose.connect(process.env.DB_URL!)
    } catch (error) {
        console.log(error)
        process.exit(1)
        
    }
}

