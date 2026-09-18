import {createClient} from 'npm:@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization');
  if(!auth) return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')!;
  const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await caller.auth.getUser();
  if(userError||!user) return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const {data:callerProfile}=await caller.from('profiles').select('role,is_active').eq('id',user.id).single();
  if(callerProfile?.role!=='admin'||!callerProfile.is_active) return Response.json({error:'Admin access required'},{status:403,headers:cors});

  const body=await req.json();
  const {full_name,email,password,phone}=body;
  if(!full_name||!email||!password) return Response.json({error:'full_name, email and password are required'},{status:400,headers:cors});

  const admin=createClient(url,service);
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name,phone:phone||''}});
  if(createError) return Response.json({error:createError.message},{status:400,headers:cors});
  const {error:profileError}=await admin.from('profiles').update({full_name,phone:phone||null,role:'employee',is_active:true}).eq('id',created.user.id);
  if(profileError){await admin.auth.admin.deleteUser(created.user.id);return Response.json({error:profileError.message},{status:500,headers:cors});}
  return Response.json({ok:true,user_id:created.user.id},{headers:cors});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unexpected error'},{status:500,headers:cors});}
});