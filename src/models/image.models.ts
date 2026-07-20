import mongoose, { Schema,} from "mongoose";

interface IMAGE {
  userId: string
  Images: string[];
}

const ImageSchema = new Schema<IMAGE>({
  userId: {
    type:String,
    required: true,
  },
  Images: {
    type: [String],
    required: true,
    default: [],
  },
});

const Image = mongoose.models.Image || mongoose.model<IMAGE>("Image", ImageSchema);

export default Image;