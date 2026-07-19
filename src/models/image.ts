import mongoose ,{Schema} from "mongoose";

interface IMAGE{
    userId:string
    Image:string[]

}

const ImageSchema=new Schema<IMAGE>({
    userId:{
        type:String,   
    }

})
const Image= mongoose.model("image",ImageSchema)

export default Image