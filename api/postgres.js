export default async function handler(req, res){
  res.setHeader('Content-Type','application/json');
  return res.status(200).json({data:[], ok:true, tabla:req.query.table||'ninguna'});
}
