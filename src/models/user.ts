import mongoose, { Schema } from "mongoose"


interface UserTypes{
    userId:string
    name:string
    email:string
    plan:string
    freeUsesCount:number
}

const UserSchema=new Schema<UserTypes>({
    userId:{
        type:String,
        unique:true,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    plan:{
        type:String,
        enum:["FREE","PRO"],
        default:"FREE"
    },
    freeUsesCount:{
        type:Number,
        default:0
    }

    
},{timestamps:true})

export const User=mongoose.models.user || mongoose.model<UserTypes>("user",UserSchema)
