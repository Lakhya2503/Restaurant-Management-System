import Menu from '../models/menu.models.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import uploadCloudinary from '../utils/cloudinary.js';
import { requiredField } from '../utils/helper.js';

const addNewMenu = asyncHandler(async(req,res)=>{

      const { itemName, itemDescription, priceOfItem, itemCategory, Ingredients, isVeg } = req.body

    requiredField([itemDescription, itemName, priceOfItem, itemCategory])


        const itemURI = req.files?.itemImage?.[0]?.path

        let menuItemURI;

        if(itemURI) {
           menuItemURI =  await uploadCloudinary(itemURI)
        }


        Array(Ingredients)

        const menuItem = {
              itemName : itemName,
              itemDescription : itemDescription,
              itemImage : menuItemURI ? menuItemURI?.url : menuItemURI,
              itemCategory : itemCategory,
              priceOfItem : priceOfItem,
              Ingredients : Ingredients,
              isVeg: isVeg !== undefined ? (String(isVeg) === 'true' || isVeg === true) : true
        }

    const menu = await Menu.create(menuItem)

    return res.status(201).
    json(new ApiResponse(201, {},`${menu.itemName} in menu add successfully` ))

})

const fetchFullMenuMenu = asyncHandler(async(req,res)=>{

  const items = await Menu.find()

  return res.status(200).json(new ApiResponse(200, items ,"all items fetch successfully"))
})

const deleteItem = asyncHandler(async(req,res)=>{

  const  {itemId} = req.params

  await Menu.findByIdAndDelete(itemId)

  return res.status(204).json(new ApiResponse(204, {}, "Item delete sucessfully"))
})

const updateItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const {
    itemName,
    itemDescription,
    priceOfItem,
    itemCategory,
    Ingredients,
    isVeg
  } = req.body;

  let itemImage;

  if (req.files?.itemImage?.[0]?.path) {
    const uploaded = await uploadCloudinary(req.files.itemImage[0].path);
    itemImage = uploaded?.url;
  }

  const updateData = {
    ...(itemName !== undefined && { itemName }),
    ...(itemDescription !== undefined && { itemDescription }),
    ...(priceOfItem !== undefined && { priceOfItem }),
    ...(itemCategory !== undefined && { itemCategory }),
    ...(Ingredients !== undefined && { Ingredients }),
    ...(isVeg !== undefined && { isVeg: String(isVeg) === 'true' || isVeg === true }),
    ...(itemImage && { itemImage })
  };


  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      message: "No valid fields provided for update"
    });
  }

  const updatedItem = await Menu.findByIdAndUpdate(
    itemId,
    { $set: updateData },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedItem) {
    return res.status(404).json({
      message: "Item not found"
    });
  }

  return res.status(200).json(
    new ApiResponse(200, updatedItem, "Item updated successfully")
  );
});


export {
    addNewMenu,
    updateItem,
    deleteItem,
    fetchFullMenuMenu
};
