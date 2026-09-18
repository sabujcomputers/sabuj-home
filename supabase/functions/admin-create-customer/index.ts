import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization');if(!auth)return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});const {data:{user}}=await caller.auth.getUser();if(!user)return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const {data:adminProfile}=await caller.from('profiles').select('role,is_active').eq('id',user.id).single();if(adminProfile?.role!=='admin'||!adminProfile.is_active)return Response.json({error:'Admin access required'},{status:403,headers:cors});
  const body=await req.json();const {name,phone,address,connection_no,monthly_amount,status,joined_at,photo_url,notes,email,password}=body;if(!name||!phone)return Response.json({error:'name and phone are required'},{status:400});
  const admin=createClient(url,service);let userId:string|null=null;
  if(email&&password){const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name,phone}});if(createError)return Response.json({error:createError.message},{status:400,headers:cors});userId=created.user.id;const {error:profileError}=await admin.from('profiles').update({full_name:name,phone,role:'customer',is_active:true}).eq('id',userId);if(profileError){await admin.auth.admin.deleteUser(userId);return Response.json({error:profileError.message},{status:500,headers:cors});}}
  let amount=Number(monthly_amount);if(!Number.isFinite(amount)){const {data:settings}=await admin.from('settings').select('monthly_bill').eq('id',1).single();amount=Number(settings?.monthly_bill||150)}
  const {data:codeData}=await admin.rpc('generate_customer_code');const customer_code=codeData||('CUST-'+Date.now().toString().slice(-5));
  const {data:customer,error:customerError}=await admin.from('customers').insert({user_id:userId,customer_code,name,phone,address:address||null,connection_no:connection_no||null,monthly_amount:amount,status:status||'active',joined_at:joined_at||new Date().toISOString().slice(0,10),photo_url:photo_url||null,notes:notes||null}).select().single();
  if(customerError){if(userId)await admin.auth.admin.deleteUser(userId);return Response.json({error:customerError.message},{status:400,headers:cors});}
  await admin.from('audit_logs').insert({actor_id:user.id,action:'customer.created',entity_type:'customer',entity_id:customer.id,details:{customer_code:customer.customer_code,name:customer.name}});
  return Response.json({ok:true,customer},{headers:cors});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unexpected error'},{status:500,headers:cors});}
});