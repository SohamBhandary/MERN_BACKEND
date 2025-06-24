


const asyncHandler=(requestHandler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

// const ansycHandler=(fn)=>async(req,res,next)=>{try {
//     await fn (req,res,next)
    
// } catch (error) {
//     res.status(error.code || 500).json({
//         succces:false,
//         message:error.message
//     })
    
// }}

export default asyncHandler;