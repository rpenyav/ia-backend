// generar-hash.ts
import * as bcrypt from "bcrypt";

async function main() {
  const password = "admin123"; // ⚠️ cambia esto por la contraseña que quieras
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash para", password, "=>");
  console.log(hash);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
