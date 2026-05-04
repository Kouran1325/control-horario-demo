import bcrypt from "bcrypt";

const pass = process.argv[2];

if (!pass) {
  console.log("Uso: node scripts/hash-pass.js TuPassword");
  process.exit(1);
}

const hash = await bcrypt.hash(pass, 10);
