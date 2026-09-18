import {createClient} from 'npm:@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
async function sha1(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-1',bytes);return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('')}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 try{
  const auth=req.headers.get('Authorization');if(!auth)return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const url=Deno.env.get('SUPABASE_URL')!;
  const anon=Deno.env.get('SUPABASE_ANON_KEY')||Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await client.auth.getUser();if(!user)return Response.json({error:'Unauthorized'},{status:401,headers:cors});
  const {data:allowed}=await client.rpc('has_permission',{p_permission:'customers.edit'});
  if(!allowed)return Response.json({error:'Upload permission required'},{status:403,headers:cors});
  const cloud= Deno.env.get('CLOUDINARY_CLOUD_NAME')!;
  const key= Deno.env.get('CLOUDINARY_API_KEY')!;
  const secret= Deno.env.get('CLOUDINARY_API_SECRET')!;
  if(!cloud||!key||!secret) return Response.json({error:'Cloudinary secrets are not configured'},{status:500,headers:cors});
  const body=await req.json();const folder=String(body.folder||'arki-network');
  const timestamp=Math.floor(Date.now()/1000);
  const signature=await sha1('folder='+folder+'&timestamp='+timestamp+secret);
  return Response.json({cloud_name:cloud,api_key:key,timestamp,signature,folder},{headers:cors});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Unexpected error'},{status:500,headers:cors});}
});