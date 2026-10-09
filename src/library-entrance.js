// Estimated from the supplied video and official frontal campus photographs.
// These are reconstruction dimensions, not measured architectural dimensions.
export const libraryEntrance = Object.freeze({
  groundY:.16, startZ:44, width:68, middleWidth:54, upperWidth:40, riser:.15, tread:.32,
  stepsPerFlight:14, middleLanding:1.6, doorZ:60,
});
const e=libraryEntrance;
export const flightLength=e.stepsPerFlight*e.tread;
export const upperFlightZ=e.startZ+flightLength+e.middleLanding;
export const stairEndZ=upperFlightZ+flightLength;
export const entranceY=e.groundY+2*e.stepsPerFlight*e.riser;

export function libraryStairWidth(z){
  const first=Math.min(flightLength,Math.max(0,z-e.startZ));
  const second=Math.max(0,Math.min(flightLength,z-upperFlightZ));
  const step=(first+second)/e.tread;
  return step<10?e.width:step<20?e.middleWidth:e.upperWidth;
}

// A continuous walking surface over the visible treads prevents per-step jolts.
export function libraryFloorHeight(x,z){
  if(z<e.startZ||z>=e.doorZ||Math.abs(x)>=libraryStairWidth(z)/2)return null;
  const first=Math.min(flightLength,z-e.startZ);
  const second=Math.max(0,Math.min(flightLength,z-upperFlightZ));
  return e.groundY+(first+second)*e.riser/e.tread;
}
