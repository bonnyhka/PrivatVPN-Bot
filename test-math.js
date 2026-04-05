const sub = { trafficUsed: BigInt("302443323") };
const plan = { trafficLimit: 100 };
const limitBigInt = BigInt(Math.floor(plan.trafficLimit * (1024 ** 3)));
console.log("limitBigInt:", limitBigInt.toString());
console.log("trafficUsed:", sub.trafficUsed.toString());
console.log("exceeded:", sub.trafficUsed >= limitBigInt);
