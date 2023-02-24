/* eslint-disable no-console */

async function main(): Promise<void> {
    console.log('running...');
}

main().catch((e) => {
   console.error(`An error occurred: ${e.stack}`);
});
