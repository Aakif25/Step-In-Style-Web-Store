(() => {
  const CART_KEY='stepinstyle_cart_supabase_v1';
  const WISH_KEY='stepinstyle_wishlist_supabase_v1';
  const CUSTOMER_KEY='stepinstyle_customer_supabase_v1';
  const cfg=window.STEP_IN_STYLE_CONFIG||{};
  const empty=()=>({
    products:[],categories:[],orders:[],reviews:[],customers:[],expenses:[],offers:[],banners:[],
    settings:{storeName:'Step in Style',tagline:'Useful finds. Better prices. Delivered in style.',phone:'0719141519',whatsapp:'94719141519',email:'hello@stepinstyle.lk',currency:'LKR',deliveryText:'Islandwide Delivery • Cash on Delivery',metaPixel:'',tiktokPixel:'',ga4:'',logo:'assets/step-in-style-logo.png'}
  });
  let cache=empty();
  let client=null;
  let adminSaveQueue=Promise.resolve();

  const money=n=>'Rs. '+Number(n||0).toLocaleString('en-LK',{maximumFractionDigits:2});
  const slugify=s=>String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const uid=(prefix='ID')=>prefix+'-'+(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));
  const configured=()=>Boolean(cfg.supabaseUrl&&cfg.supabasePublishableKey&&!String(cfg.supabaseUrl).includes('YOUR_SUPABASE')&&!String(cfg.supabasePublishableKey).includes('YOUR_SUPABASE'));

  function ensureClient(){
    if(client)return client;
    if(!configured())throw new Error('Supabase is not configured yet. Open config.js and add your Project URL and Publishable Key.');
    if(!window.supabase?.createClient)throw new Error('Supabase JavaScript library did not load. Check your internet connection.');
    client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  const cleanError=e=>e?.message||e?.error_description||String(e||'Unknown error');
  function assert(result,label='Supabase request'){
    if(result?.error)throw new Error(`${label}: ${cleanError(result.error)}`);
    return result?.data;
  }
  const num=x=>Number(x||0);
  const arr=x=>Array.isArray(x)?x:[];

  function mapProduct(r,s={}){
    return {
      id:r.id,name:r.name||'',slug:r.slug||'',shortDescription:r.short_description||'',category:r.category||'',productCode:r.product_code||'',brand:r.brand||'',
      price:num(r.price),oldPrice:num(r.old_price),supplier:s.supplier||'A to Z Dropshipping',supplierCode:s.supplier_code||'',supplierUrl:s.supplier_url||'',supplierCost:num(s.supplier_cost),shipping:num(s.shipping),otherCost:num(s.other_cost),adCost:num(s.ad_cost),
      stock:r.stock||'available',qty:r.qty==null?999:Number(r.qty),status:r.status||'draft',featured:!!r.featured,newArrival:!!r.new_arrival,badge:r.badge||'',views:Number(r.views||0),
      media:r.media||{images:[],videos:[]},descriptionBlocks:r.description_blocks||[],variants:r.variants||[],seo:r.seo||{title:'',description:'',keywords:''},createdAt:r.created_at||new Date().toISOString(),updatedAt:r.updated_at||new Date().toISOString()
    };
  }
  function productRow(p){return {id:p.id,name:p.name,slug:p.slug||slugify(p.name),short_description:p.shortDescription||'',category:p.category||'',product_code:p.productCode||'',brand:p.brand||'',price:num(p.price),old_price:num(p.oldPrice),stock:p.stock||'available',qty:p.qty===999?null:Number(p.qty||0),status:p.status||'draft',featured:!!p.featured,new_arrival:!!p.newArrival,badge:p.badge||'',media:p.media||{images:[],videos:[]},description_blocks:p.descriptionBlocks||[],variants:p.variants||[],seo:p.seo||{},created_at:p.createdAt||new Date().toISOString(),updated_at:p.updatedAt||new Date().toISOString()};}
  function supplierRow(p){return {product_id:p.id,supplier:'A to Z Dropshipping',supplier_code:p.supplierCode||'',supplier_url:p.supplierUrl||'',supplier_cost:num(p.supplierCost),shipping:num(p.shipping),other_cost:num(p.otherCost),ad_cost:num(p.adCost),updated_at:new Date().toISOString()};}
  function mapOrder(o,items){return {id:o.id,date:o.created_at,customer:o.customer||{},items:(items||[]).filter(i=>i.order_id===o.id).map(i=>({productId:i.product_id,name:i.name,qty:Number(i.qty||1),price:num(i.price),supplierCost:num(i.supplier_cost),shipping:num(i.shipping),otherCost:num(i.other_cost),adCost:num(i.ad_cost),supplierCode:i.supplier_code||'',supplierUrl:i.supplier_url||''})),subtotal:num(o.subtotal),delivery:num(o.delivery),total:num(o.total),status:o.status||'new',supplierOrderId:o.supplier_order_id||'',profitStatus:o.profit_status||'pending',receivedProfit:num(o.received_profit),profitReceivedDate:o.profit_received_date||'',adminNotes:o.admin_notes||'',source:o.source||'Website'};}
  function orderRow(o){return {id:o.id,customer:o.customer||{},subtotal:num(o.subtotal),delivery:num(o.delivery),total:num(o.total),status:o.status||'new',supplier_order_id:o.supplierOrderId||'',profit_status:o.profitStatus||'pending',received_profit:num(o.receivedProfit),profit_received_date:o.profitReceivedDate||null,admin_notes:o.adminNotes||'',source:o.source||'Website',created_at:o.date||new Date().toISOString(),updated_at:new Date().toISOString()};}
  function mapReview(r){return {id:r.id,productId:r.product_id,customerId:r.customer_id||'',name:r.customer_name||'',phone:r.phone||'',rating:Number(r.rating||0),text:r.review_text||'',status:r.status||'pending',verified:!!r.verified,date:(r.created_at||'').slice(0,10),media:r.media||{images:[],videos:[]},reply:r.reply||''};}
  function reviewRow(r){return {id:r.id,product_id:r.productId,customer_id:r.customerId||null,customer_name:r.name||'',phone:r.phone||'',rating:Number(r.rating||1),review_text:r.text||'',status:r.status||'pending',verified:!!r.verified,media:r.media||{images:[],videos:[]},reply:r.reply||'',created_at:r.date?new Date(r.date+'T00:00:00').toISOString():new Date().toISOString()};}
  function mapSettings(s){return {storeName:s?.store_name||'Step in Style',tagline:s?.tagline||'Useful finds. Better prices. Delivered in style.',phone:s?.phone||'0719141519',whatsapp:s?.whatsapp||'94719141519',email:s?.email||'hello@stepinstyle.lk',currency:s?.currency||'LKR',deliveryText:s?.delivery_text||'Islandwide Delivery • Cash on Delivery',metaPixel:s?.meta_pixel||'',tiktokPixel:s?.tiktok_pixel||'',ga4:s?.ga4||'',logo:'assets/step-in-style-logo.png'};}
  function settingsRow(s){return {id:1,store_name:'Step in Style',tagline:s.tagline||'',phone:'0719141519',whatsapp:'94719141519',email:s.email||'',currency:'LKR',delivery_text:s.deliveryText||'Islandwide Delivery • Cash on Delivery',meta_pixel:s.metaPixel||'',tiktok_pixel:s.tiktokPixel||'',ga4:s.ga4||'',updated_at:new Date().toISOString()};}

  async function loadPublic(){
    const c=ensureClient();
    const [pr,ca,rv,of,bn,st]=await Promise.all([
      c.from('products').select('*').eq('status','published').order('created_at',{ascending:false}),
      c.from('categories').select('*').order('name'),
      c.from('reviews').select('*').eq('status','approved').order('created_at',{ascending:false}),
      c.from('offers').select('*').eq('active',true).order('created_at',{ascending:false}),
      c.from('banners').select('*').eq('active',true).order('created_at',{ascending:false}),
      c.from('store_settings').select('*').eq('id',1).maybeSingle()
    ]);
    cache=empty();
    cache.products=arr(assert(pr,'Load products')).map(r=>mapProduct(r));
    cache.categories=arr(assert(ca,'Load categories')).map(x=>x.name);
    cache.reviews=arr(assert(rv,'Load reviews')).map(mapReview);
    cache.offers=arr(assert(of,'Load offers')).map(o=>({id:o.id,name:o.name,type:o.type,value:num(o.value),active:o.active,start:o.start_date||'',end:o.end_date||''}));
    cache.banners=arr(assert(bn,'Load banners')).map(b=>({id:b.id,title:b.title,subtitle:b.subtitle,active:b.active,imageUrl:b.image_url||''}));
    cache.settings=mapSettings(assert(st,'Load settings'));
    return cache;
  }

  async function loadAdmin(){
    await adminSaveQueue.catch(()=>{});
    const c=ensureClient();
    const is=assert(await c.rpc('is_admin'),'Check admin permission');
    if(!is)throw new Error('This signed-in account is not registered in the admin_users table.');
    const [pr,sp,ca,or,it,rv,cu,ex,of,bn,st]=await Promise.all([
      c.from('products').select('*').order('created_at',{ascending:false}),
      c.from('product_supplier_private').select('*'),
      c.from('categories').select('*').order('name'),
      c.from('orders').select('*').order('created_at',{ascending:false}),
      c.from('order_items').select('*'),
      c.from('reviews').select('*').order('created_at',{ascending:false}),
      c.from('customers').select('*').order('last_order_at',{ascending:false,nullsFirst:false}),
      c.from('expenses').select('*').order('expense_date',{ascending:false}),
      c.from('offers').select('*').order('created_at',{ascending:false}),
      c.from('banners').select('*').order('created_at',{ascending:false}),
      c.from('store_settings').select('*').eq('id',1).maybeSingle()
    ]);
    const supplierMap=new Map(arr(assert(sp,'Load supplier data')).map(x=>[x.product_id,x]));
    const items=arr(assert(it,'Load order items'));
    cache=empty();
    cache.products=arr(assert(pr,'Load products')).map(r=>mapProduct(r,supplierMap.get(r.id)||{}));
    cache.categories=arr(assert(ca,'Load categories')).map(x=>x.name);
    cache.orders=arr(assert(or,'Load orders')).map(o=>mapOrder(o,items));
    cache.reviews=arr(assert(rv,'Load reviews')).map(mapReview);
    cache.customers=arr(assert(cu,'Load customers')).map(x=>({id:x.id,name:x.name,phone:x.phone,email:x.email,orders:Number(x.orders_count||0),lastOrderAt:x.last_order_at,createdAt:x.created_at}));
    cache.expenses=arr(assert(ex,'Load expenses')).map(x=>({id:x.id,date:x.expense_date,category:x.category,amount:num(x.amount),note:x.note||''}));
    cache.offers=arr(assert(of,'Load offers')).map(o=>({id:o.id,name:o.name,type:o.type,value:num(o.value),active:o.active,start:o.start_date||'',end:o.end_date||''}));
    cache.banners=arr(assert(bn,'Load banners')).map(b=>({id:b.id,title:b.title,subtitle:b.subtitle,active:b.active,imageUrl:b.image_url||''}));
    cache.settings=mapSettings(assert(st,'Load settings'));
    return cache;
  }

  async function getProduct(id,{preview=false}={}){
    const c=ensureClient();
    let q=c.from('products').select('*').eq('id',id);
    if(!preview)q=q.eq('status','published');
    const row=assert(await q.maybeSingle(),'Load product');
    if(!row)return null;
    let supplier={};
    if(preview){const auth=await c.auth.getUser();if(auth.data?.user){const r=await c.from('product_supplier_private').select('*').eq('product_id',id).maybeSingle();if(!r.error)supplier=r.data||{};}}
    return mapProduct(row,supplier);
  }

  async function incrementView(id){const c=ensureClient();const r=await c.rpc('increment_product_view',{p_product_id:id});if(r.error)console.warn(r.error.message);}
  async function placeOrder(customer,items){const c=ensureClient();return assert(await c.rpc('place_order',{p_customer:customer,p_items:items.map(x=>({productId:x.productId,qty:Number(x.qty||1)}))}),'Place order');}
  async function submitReview(payload){const c=ensureClient();return assert(await c.rpc('submit_review',{p_product_id:payload.productId,p_name:payload.name,p_phone:payload.phone||'',p_rating:Number(payload.rating),p_text:payload.text,p_media:payload.media||{images:[],videos:[]}}),'Submit review');}

  function safeFileName(name){return String(name||'file').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-100);}
  async function uploadFile(bucket,path,file,{upsert=false}={}){
    const c=ensureClient();
    const r=await c.storage.from(bucket).upload(path,file,{cacheControl:'3600',upsert,contentType:file.type||undefined});
    assert(r,'Upload media');
    const pub=c.storage.from(bucket).getPublicUrl(path);
    return pub.data.publicUrl;
  }
  async function uploadAdminMedia(bucket,productId,file){
    const ext=(file.name.split('.').pop()||'bin').toLowerCase();
    const path=`products/${productId}/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}-${safeFileName(file.name||('media.'+ext))}`;
    return uploadFile(bucket,path,file);
  }
  async function uploadReviewMedia(draftId,file){
    const path=`submissions/${draftId}/${Date.now()}-${crypto.randomUUID?.()||Math.random().toString(36).slice(2)}-${safeFileName(file.name)}`;
    return uploadFile('review-media',path,file);
  }

  async function syncAdmin(db){
    const c=ensureClient();
    const is=assert(await c.rpc('is_admin'),'Check admin permission');if(!is)throw new Error('Admin permission required.');
    if(db.categories?.length){
      const rows=db.categories.map(name=>({name,slug:slugify(name)}));assert(await c.from('categories').upsert(rows,{onConflict:'name'}),'Save categories');
    }
    if(db.products?.length){
      assert(await c.from('products').upsert(db.products.map(productRow),{onConflict:'id'}),'Save products');
      assert(await c.from('product_supplier_private').upsert(db.products.map(supplierRow),{onConflict:'product_id'}),'Save private supplier data');
    }
    if(db.orders?.length)assert(await c.from('orders').upsert(db.orders.map(orderRow),{onConflict:'id'}),'Save orders');
    if(db.reviews?.length)assert(await c.from('reviews').upsert(db.reviews.map(reviewRow),{onConflict:'id'}),'Save reviews');
    if(db.expenses?.length)assert(await c.from('expenses').upsert(db.expenses.map(e=>({id:e.id,expense_date:e.date,category:e.category,amount:num(e.amount),note:e.note||''})),{onConflict:'id'}),'Save expenses');
    if(db.offers?.length)assert(await c.from('offers').upsert(db.offers.map(o=>({id:o.id,name:o.name,type:o.type||'percent',value:num(o.value),active:o.active!==false,start_date:o.start||null,end_date:o.end||null})),{onConflict:'id'}),'Save offers');
    if(db.banners?.length)assert(await c.from('banners').upsert(db.banners.map(b=>({id:b.id,title:b.title,subtitle:b.subtitle||'',active:b.active!==false,image_url:b.imageUrl||''})),{onConflict:'id'}),'Save banners');
    assert(await c.from('store_settings').upsert(settingsRow(db.settings||cache.settings),{onConflict:'id'}),'Save settings');
    cache=db;
    return true;
  }
  function saveAdmin(db){
    adminSaveQueue=adminSaveQueue.then(()=>syncAdmin(JSON.parse(JSON.stringify(db))));
    adminSaveQueue.catch(e=>window.dispatchEvent(new CustomEvent('storedb-error',{detail:e.message})));
    return adminSaveQueue;
  }

  async function deleteRow(table,column,value){await adminSaveQueue.catch(()=>{});const c=ensureClient();assert(await c.from(table).delete().eq(column,value),`Delete ${table}`);}
  const deleteProduct=id=>deleteRow('products','id',id);
  const deleteReview=id=>deleteRow('reviews','id',id);
  const deleteExpense=id=>deleteRow('expenses','id',id);
  const deleteOffer=id=>deleteRow('offers','id',id);
  const deleteBanner=id=>deleteRow('banners','id',id);
  async function deleteCategory(name){return deleteRow('categories','name',name);}

  async function resetBusinessData(){
    await adminSaveQueue.catch(()=>{});
    const c=ensureClient();
    const is=assert(await c.rpc('is_admin'),'Check admin permission');if(!is)throw new Error('Admin permission required.');
    const ops=[
      ['reviews','id'],['order_items','id'],['orders','id'],['customers','id'],['expenses','id'],['offers','id'],['banners','id'],['product_supplier_private','product_id'],['products','id'],['categories','id']
    ];
    for(const [t,col] of ops){const r=await c.from(t).delete().not(col,'is',null);if(r.error)throw new Error(`Reset ${t}: ${r.error.message}`);}
    cache=empty();
    return true;
  }

  async function signInAdmin(email,password){
    const c=ensureClient();
    assert(await c.auth.signInWithPassword({email,password}),'Admin sign in');
    const ok=assert(await c.rpc('is_admin'),'Check admin permission');
    if(!ok){await c.auth.signOut();throw new Error('This account is not an authorized Step in Style admin.');}
    return true;
  }
  async function adminIsSignedIn(){
    const c=ensureClient();
    const s=await c.auth.getSession();
    if(!s.data?.session)return false;
    const r=await c.rpc('is_admin');return !r.error&&r.data===true;
  }
  async function signOut(){const c=ensureClient();await c.auth.signOut();}

  async function signUpCustomer(name,email,password,phone=''){
    const c=ensureClient();
    const r=await c.auth.signUp({email,password,options:{data:{name,phone}}});assert(r,'Create customer account');return r.data;
  }
  async function signInCustomer(email,password){const c=ensureClient();const r=await c.auth.signInWithPassword({email,password});assert(r,'Customer sign in');return r.data;}
  async function signInGoogle(){const c=ensureClient();const r=await c.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});assert(r,'Google sign in');}
  async function currentUser(){const c=ensureClient();const r=await c.auth.getUser();if(r.error)return null;return r.data.user||null;}

  window.StoreDB={
    CART_KEY,WISH_KEY,CUSTOMER_KEY,money,slugify,uid,configured,ensureClient,
    load:()=>cache,getCache:()=>cache,loadPublic,loadAdmin,getProduct,incrementView,placeOrder,submitReview,
    uploadAdminMedia,uploadReviewMedia,save:saveAdmin,deleteProduct,deleteReview,deleteExpense,deleteOffer,deleteBanner,deleteCategory,resetBusinessData,
    signInAdmin,adminIsSignedIn,signOut,signUpCustomer,signInCustomer,signInGoogle,currentUser
  };
})();
