
document.addEventListener("DOMContentLoaded",()=>{

const brand=document.getElementById("brandFilter")
const fuel=document.getElementById("fuelFilter")

function filter(){

const b=brand.value
const f=fuel.value

document.querySelectorAll(".car-card").forEach(card=>{

let show=true

if(b && card.dataset.brand!==b) show=false
if(f && card.dataset.fuel!==f) show=false

card.style.display=show?"block":"none"

})

}

brand?.addEventListener("change",filter)
fuel?.addEventListener("change",filter)

})
