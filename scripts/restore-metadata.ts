import prisma from '@/lib/db'

async function main() {
  console.log('RESTORATION V8 (Real Names & Metadata)...')

  const metaMapping: Record<string, { u: string, f: string, l: string }> = {
    "cmmxn8m5f0000ujicq0uarnfy": { u: "Bonnyhka", f: "Bonny", l: "Назар" },
    "cmn8zb3z80001wt7od4ea6v1x": { u: "Bonnyhka", f: "Bonny", l: "Назар" },
    "cmmxohklb00007xuryhnsi6e6": { u: "privatvpnadmin", f: "PRIVAT VPN", l: "" },
    "7923347249": { u: "privatvpnadmin", f: "PRIVAT VPN", l: "" },
    "cmmxoliyp00017xuravng19tk": { u: "Nelli_Dmitrievna00", f: "Нэлли", l: "Штабель" },
    "cmmxoluqk00027xurn1jxiwfe": { u: "meliskiq", f: "Mike", l: "" },
    "cmmxr3vad000412y871agexv4": { u: "Gervvvvv", f: "Re:Gerv", l: "(Максимилиан)" },
    "cmmxssfij00008k6lxskypk96": { u: "SHAMPUNCH1k", f: "S H Λ M P U N C H 1 K", l: "" },
    // From Screenshot
    "cmn5w5394000cdbn99ds9p4ta": { u: "saveliyaWATA", f: "saveliyaWATA", l: "" },
    "cmn4w1re50008jrajn4jqgtyl": { u: "Lev", f: "Lev", l: "" },
    "9038c180-b10a-4a39-8e90-c3aa0bf37bda": { u: "Назар", f: "Назар", l: "" },
  }

  const userIds = [
    "cmmxn8m5f0000ujicq0uarnfy", "cmn8zb3z80001wt7od4ea6v1x", "7923347249",
    "cmmxohklb00007xuryhnsi6e6", "cmmxoliyp00017xuravng19tk", "cmmxoluqk00027xurn1jxiwfe", "cmmxr3vad000412y871agexv4",
    "cmn0hhky20002pr24mmy4sux2", "cmn0jcfqn000dpr24f7dan6kh", "cmn0m1qa50004tifasdqdzbry",
    "cmn1luz7a000eu67uaqknfe6i", "cmn1srkec001eu67uysvtan5k", "cmn1tr1z8001lu67ugrx5hndf",
    "cmn1ys9pl000g14cnhry3pksj", "cmn2o4kux001a13a03rbn7sd4", "cmn4w1re8000ajrajtw71xtv1",
    "cmn5w5399000edbn99f2xff82", "cmn63pqbt000pdbn9nq7h1e8l", "cmn6bdkr90006z7vx8j39t95d",
    "cmn7krmtm0009101a99gwmrqc", "cmn8z6r2c0005atioxjewwa1h",
    "cmn5w5394000cdbn99ds9p4ta", "cmn4w1re50008jrajn4jqgtyl", "9038c180-b10a-4a39-8e90-c3aa0bf37bda",
    "113a910e-94de-4b78-8416-157945336d79", "13adf112-fb29-48cf-ba3f-0697193c9ee3",
    "97513733-428a-45bc-839c-a70926f4423d", "9e9fead5-a5d5-4545-afc3-756dfb4d42d0",
    "abcadff7-5ec5-448e-91e9-1983352f564a", "afba3ca4-ba7d-49bb-93f5-8abba910ae75",
    "e8643d9d-a130-4947-a16a-86771d777f51", "1", "cmmxssfij00008k6lxskypk96"
  ]

  console.log('Updating user metadata...')
  for (const id of userIds) {
    const meta = metaMapping[id]
    if (meta) {
       await prisma.user.update({
         where: { id: id },
         data: {
           username: meta.u,
           firstName: meta.f,
           lastName: meta.l
         }
       })
    }
  }

  console.log('Restoration V8 Complete!')
}

main().finally(() => prisma.$disconnect())
