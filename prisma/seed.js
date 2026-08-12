async function main() {
  console.info("Seed base ejecutado. No hay datos de ejemplo por defecto.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  });