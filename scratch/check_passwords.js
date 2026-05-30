const bcrypt = require('bcryptjs');

const users = [
  {
    email: 'passenger@ceylon.lk',
    hash: '$2a$10$k7kpxcUcOPx6dG4Kpnryz.ZBgJIl25dZBdUBeJz6T8zA.ubEiRAJa',
    pw: 'Pass123!'
  },
  {
    email: 'admin@ceylon.lk',
    hash: '$2a$10$f2eAt1UuqwYXBlTutavpye3A3En490Zef8g1Tdrz4UKPU93gyR.s6',
    pw: 'Admin123!'
  },
  {
    email: 'staff@ceylon.lk',
    hash: '$2a$10$qxCL1TIQWP.jjDg4ocHro.l6x.56WMoZlC00lAeucQsc.2vRRaCoy',
    pw: 'Staff123!'
  }
];

async function main() {
    for (const u of users) {
        const match = await bcrypt.compare(u.pw, u.hash);
        console.log(`${u.email}: password matches "${u.pw}"? ${match}`);
    }
}
main();
