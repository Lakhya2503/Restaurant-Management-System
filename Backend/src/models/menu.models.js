import mongoose from 'mongoose';
import { menuCategoryEnums } from '../utils/constants.js';
const menuSchema = new mongoose.Schema(
    {
        itemName : {
          type: String,
          required : true,
          trim : true
        },
        itemImage : {
          type :  String,
          required : true
        },
        priceOfItem : {
          type : Number,
          required : true
        },
        itemCategory : {
          type : String,
          default : "",
          required : true,
          enum : menuCategoryEnums
        },
        isAvailable : {
          type : Boolean,
          required : true,
          default: true
        },
        isVeg : {
          type : Boolean,
          default : true
        },
        Ingredients : {
          type : Array,
          default : []
        },
        itemDescription : {
          type : String,
          default : ""
        }
   } , { timestamps : true}
)


const Menu = mongoose.model("Menu", menuSchema)
export default Menu;
