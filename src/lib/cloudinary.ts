export async function uploadImage(file:File,folder='arki-network'){
 const {data,error}=await supabase.functions.invoke('cloudinary-signature',{body:{folder}});
 if(error||data?.error)throw new Error(error?.message||data?.error||'Cloudinary signature failed');
 const form=new FormData();form.append('file',file);form.append('api_key',data.api_key);form.append('timestamp',String(data.timestamp));form.append('signature',data.signature);form.append('folder',data.folder);
 const res=await fetch('https://api.cloudinary.com/v1_1/'+data.cloud_name+'/image/upload',{method:'POST',body:form});
 if(!res.ok)throw new Error('Cloudinary upload failed');
 const json=await res.json();return json.secure_url as string;
}
