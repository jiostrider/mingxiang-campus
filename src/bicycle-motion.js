const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function steerBicycle(steering,input,speed,dt){
  const target=input*.64/(1+Math.max(0,Math.abs(speed)-3)*.15);
  const angle=steering+(target-steering)*(1-Math.exp(-dt*9));
  // Bicycle kinematics: the front wheel turns even at rest; forward and reverse
  // motion curve in opposite directions. Low-speed turns are much more usable.
  const yawDelta=clamp(speed/1.21*Math.tan(angle),-1.65,1.65)*dt;
  return {angle,yawDelta};
}
