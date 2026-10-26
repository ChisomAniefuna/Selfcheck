const specs = [
 ['Cloud Wash','Cleanser',['Glycerin','Coco-glucoside'],'Gentle cleansing',14,'cream','tube'],
 ['Daily Dew','Moisturizer',['Glycerin','Ceramides'],'Everyday hydration',22,'sage','jar'],
 ['Daylight 50','Sunscreen',['Zinc oxide','Glycerin'],'Sun protection',24,'yellow','tube'],
 ['Balance Drops','Serum',['Niacinamide','Glycerin'],'Uneven tone',18,'amber','dropper'],
 ['Quiet Cream','Moisturizer',['Ceramides','Panthenol'],'Everyday hydration',26,'pink','jar'],
 ['Water Reserve','Serum',['Hyaluronic acid','Glycerin'],'Hydration',20,'blue','dropper'],
 ['Soft Reset','Cleanser',['Glycerin','Decyl glucoside'],'Gentle cleansing',16,'sage','tube'],
 ['Night Envelope','Moisturizer',['Squalane','Glycerin'],'Everyday hydration',28,'cream','jar'],
 ['Bright Hours','Serum',['Ascorbic acid','Glycerin'],'Uneven tone',30,'yellow','dropper'],
 ['Evening Edit','Treatment',['Retinol','Squalane'],'Texture',32,'pink','dropper'],
 ['Clear Chapter','Treatment',['Salicylic acid','Glycerin'],'Blemish appearance',19,'blue','tube'],
 ['Sunday Milk','Cleanser',['Glycerin','Squalane'],'Gentle cleansing',18,'pink','bottle'],
 ['Daily Shade','Sunscreen',['Zinc oxide','Titanium dioxide'],'Sun protection',27,'sage','tube'],
 ['Calm Current','Serum',['Panthenol','Glycerin'],'Hydration',24,'sage','dropper'],
 ['Velvet Veil','Moisturizer',['Squalane','Ceramides'],'Everyday hydration',25,'blue','jar'],
 ['Mystery Serum','Serum',[],'Unknown',null,'cream','dropper']
];
export const products = specs.map((p,i)=>({id:`sample_${i+1}`,name:p[0],brand:'STILL / SAMPLE COLLECTION',category:p[1],ingredients:p[2],claim:p[3],price:p[4],currency:'USD',color:p[5],shape:p[6],sample:true,source:`Fictional sample catalogue · ${p[0]}`,verified_at:null}));
export function compare(routine,candidate,{budget,goal='Hydration',sensitive=false,scanUsed=false}={}) {
 const reasons=[],unknowns=['Individual tolerance and product effectiveness cannot be determined.','Concentrations and complete formulations are unavailable in this sample catalogue.'];
 if(!candidate||!candidate.ingredients?.length)return {decision:'needs_more_info',reasons:[{text:'The candidate has no ingredient data. A meaningful comparison needs a complete ingredient list.',source:candidate?.source||'Missing product'}],unknowns,next:['Confirm the product’s full ingredient list and stated purpose.'],scan_used:scanUsed,confidence:'Limited'};
 const same=routine.filter(p=>p.category===candidate.category),overlap=[...new Set(routine.flatMap(p=>p.ingredients).filter(i=>candidate.ingredients.includes(i)))];
 let decision='consider';
 if(routine.some(p=>p.id===candidate.id)){decision='skip';reasons.push({text:'This exact sample product is already on your shelf. Another purchase may be unnecessary unless you are replacing it.',source:candidate.source});}
 else if(same.length){decision='hold';reasons.push({text:`${same.map(p=>p.name).join(' and ')} already serves the same basic role: ${candidate.category.toLowerCase()}. Check whether another adds value.`,source:same.map(p=>p.source).join('; ')});}
 else reasons.push({text:`You haven’t added a ${candidate.category.toLowerCase()} to your shelf. This is a new category in your selected routine.`,source:'Your selected shelf'});
 if(overlap.length) reasons.push({text:`Shared ingredients: ${overlap.join(', ')}. Ingredient overlap does not establish equivalent formulations or safety.`,source:candidate.source});
 else reasons.push({text:`The sample lists ${candidate.ingredients.join(' and ')}. Your selected products do not list these ingredients.`,source:candidate.source});
 if(budget>0&&candidate.price>budget){if(decision!=='skip')decision='hold';reasons.push({text:`At $${candidate.price}, this is $${candidate.price-budget} above your $${budget} budget.`,source:'Your budget and sample price'});}
 if(sensitive)unknowns.push('You reported sensitivity. This comparison cannot predict irritation or establish allergy safety.');
 if(!routine.length)unknowns.push('Your shelf is empty; this is a beginner comparison with limited routine context.');
 return {decision,reasons,unknowns,next:['Compare full formulations and your actual usage before deciding.',`Check whether the stated purpose, “${candidate.claim.toLowerCase()}”, matches your goal of ${goal.toLowerCase()}.`],scan_used:scanUsed,confidence:'Limited'};
}
