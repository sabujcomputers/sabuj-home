import {supabase} from './supabase';

export async function uploadImage(file:File,folder:string){
  const {data,error}=await supabase.functions.invoke('cloudinary-signature',{body:{folder}});
  if(error||data?.error) throw new Error(error?.message||data?.error||'Cloudinary signing failed');
  const form=new FormData();
  form.append('file',file);
  form.append('api_key',data.api_key);
  form.append('timestamp',String(data.timestamp));
  form.append('signature',data.signature);
  form.append('folder',data.folder);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${data.cloud_name}/image/upload`,{method:'POST',body:form});
  const json=await response.json();
  if(!response.ok) throw new Error(json?.error?.message||'Cloudinary upload failed');
  return json.secure_url as string;
}