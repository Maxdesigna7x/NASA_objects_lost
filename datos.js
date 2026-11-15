'use strict';
const objects = {
  vanguard: ['Vanguard 1','Tierra','Satélite de 1958, sin comunicación desde 1964. Su órbita es elíptica. NORAD 5.','https://www.nrl.navy.mil/ppd/Article/2507198/nrl-celebrates-60-years-in-space-with-vanguard/','Esfera con antenas'],
  envisat: ['Envisat','Tierra','Satélite de observación de ESA. Su misión terminó en 2012. La retirada de este juego es una simulación.','https://visuals.earth.esa.int/satellites/envisat','Satélite con ala solar'],
  challenger: ['Challenger','Luna','Etapa de descenso del Apolo 17, en Taurus–Littrow desde 1972.','https://science.nasa.gov/photojournal/exploring-the-apollo-17-site/','Base con cuatro patas'],
  lrv: ['Rover del Apolo 17','Luna','Vehículo de cuatro ruedas que recorrió el valle Taurus–Littrow en 1972.','https://science.nasa.gov/resource/apollo-17-gene-cernan-in-lunar-roving-vehicle/','Rover lunar abierto'],
  sojourner: ['Sojourner','Marte','Rover de Mars Pathfinder. La visita representa la región aproximada de aterrizaje en Ares Vallis.','https://science.nasa.gov/mission/mars-pathfinder/','Rover de perfil bajo'],
  opportunity: ['Opportunity','Marte','Rover de seis ruedas. Su última ubicación documentada fue Perseverance Valley.','https://science.nasa.gov/resource/opportunity-rovers-final-mars-images/','Rover con mástil alto']
};

const sectors = [
  {name:'Zacatepec · Despegue', gravity:230, ground:180, sky:'#214668', gates:[[0,-200],[95,-475],[205,-770]]},
  {name:'Órbita · Vanguard 1', gravity:0, sky:'#070e24', target:'vanguard', point:[420,-110], jump:[810,-235], next:3, optional:2},
  {name:'Órbita · Envisat', gravity:0, sky:'#0a1027', target:'envisat', point:[370,-150], jump:[720,-85], next:3, back:1},
  {name:'Luna · Taurus–Littrow', gravity:75, ground:180, sky:'#111227', target:'challenger', point:[440,145], extra:'lrv', extraPoint:[690,149], jump:[890,-115], next:4},
  {name:'Marte · Ares Vallis', gravity:145, ground:180, sky:'#402537', target:'sojourner', point:[440,150], jump:[795,-105], optional:5},
  {name:'Marte · Perseverance Valley', gravity:145, ground:180, sky:'#512938', target:'opportunity', point:[430,144], jump:[790,-95], back:4}
];
