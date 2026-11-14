const API_BASE=(import.meta.env.VITE_API_BASE_URL||"").replace(/\/$/,"");
export async function getJson(path,options={}){
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
 try{const response=await fetch(`${API_BASE}${path}`,{...options,signal:controller.signal,headers:{"Accept":"application/json",...(options.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||body.error||`Request failed with status ${response.status}`);return body;}
 catch(error){if(error.name==="AbortError")throw new Error("The API request timed out. Please retry.");throw error;}
 finally{clearTimeout(timeout);}
}
