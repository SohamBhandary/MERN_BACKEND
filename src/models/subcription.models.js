import mongoose ,{Schema} from "mongoose";

const subscriptionSchema= new Schema({

    subcriber:{
        type:Schema.Types.ObjectId, //onw who is sunbscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,// one to whom "subcriber" is subcribing
        ref:"User"

    }
},{timestamps:true})

export const Subcription= mongoose.model("subcription",subscriptionSchema)