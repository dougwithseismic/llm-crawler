import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import readline from 'readline';
import { promisify } from 'util';

const FLICKER_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/\\~`';
const LOGO_LINES = `
                     ⚒️ KHAZAD-DÛM TUNNEL FORGE ⚒️

              TUNNEL I   : Deep Roads Network (Mithril-Grade)
              TUNNEL II  : Mines of Moria Link (Adamantium)
              TUNNEL III : Erebor Express (Dragon-Proof)

                    FORGED IN THE DEPTHS OF NGROK
                       BY THE SECRET FIRES OF
                     THE DWARVEN CODE-SMITHS

             Master Smith      : Doug Silkstone
             Chief Engineer    : Thorin Stoneweaver
             Network Wardens   : Balin, Dwalin, Gimli
             Security Master   : Glóin Cryptbeard
             Tunnel Architect  : Bombur Deepcode
             Rune Scribe       : Ori Scrollkeeper

             Connected Holds   : EREBOR, IRON HILLS, BLUE MOUNTAINS
                                 KHAZAD-DÛM, GUNDABAD, NOGROD

       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
       BEWARE YE WHO ENTER: This forge creates secure tunnels through ngrok,
       allowing outside travelers to reach your local server deep within the
       mountain halls. While mithril-forged for strength, remember that
       dragons lurk in the outside world - secure thy endpoints well!

       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

                    Crafted in the depths by WithSeismic`.split('\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = promisify(rl.question).bind(rl);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const printWithDelay = async (message: string, delayMs = 100) => {
  console.log(message);
  await sleep(delayMs);
};

const getRandomChar = () =>
  FLICKER_CHARS[Math.floor(Math.random() * FLICKER_CHARS.length)];

const flickerLine = (line: string): string => {
  const chars = line.split('');
  const numFlickers = Math.floor(Math.random() * 8) + 1;

  for (let i = 0; i < numFlickers; i++) {
    const pos = Math.floor(Math.random() * chars.length);
    if (chars[pos] !== ' ' && chars[pos] !== '⚡️') {
      chars[pos] = getRandomChar();
    }
  }

  return chars.join('');
};

const displayMatrixArt = async () => {
  console.clear();
  for (const line of LOGO_LINES) {
    if (line.trim()) {
      for (let i = 0; i < 3; i++) {
        process.stdout.write(`\r${flickerLine(line)}`);
        await sleep(12);
      }
      console.log(`\r${line}`);
      await sleep(100);
    } else {
      console.log(line);
      await sleep(50);
    }
  }
};

const installDependencies = async () => {
  try {
    await printWithDelay('Gathering the materials...');
    execSync('pnpm i', { stdio: 'inherit' });
  } catch (error) {
    console.error('The forge fires have failed:', error);
    process.exit(1);
  }
};

const main = async () => {
  await installDependencies();
  await displayMatrixArt();
  await sleep(500);

  const authtoken = await question(
    '\nPresent your ngrok authtoken, master dwarf\n' +
      'Find it in the halls of https://dashboard.ngrok.com/get-started/your-authtoken\n\n' +
      '> ',
  );

  if (!authtoken) {
    console.error('\nWithout an authtoken, the gates shall remain sealed.');
    process.exit(1);
  }

  const envPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envPath)) {
    console.error(
      '\nThe sacred scrolls (.env.local) are missing from the archives!',
    );
    process.exit(1);
  }

  try {
    await printWithDelay('\nInscribing the runes of configuration...');
    let envContent = readFileSync(envPath, 'utf8');

    if (envContent.includes('ENABLE_TUNNEL=')) {
      envContent = envContent.replace(/ENABLE_TUNNEL=.*/, 'ENABLE_TUNNEL=true');
    } else {
      envContent += '\n# Tunnel Configuration\nENABLE_TUNNEL=true';
    }

    if (envContent.includes('NGROK_AUTHTOKEN=')) {
      envContent = envContent.replace(
        /NGROK_AUTHTOKEN=.*/,
        `NGROK_AUTHTOKEN=${authtoken}`,
      );
    } else {
      envContent += `\nNGROK_AUTHTOKEN=${authtoken}`;
    }

    writeFileSync(envPath, envContent);
    await printWithDelay('The runes have been inscribed in the scrolls.');
  } catch (error) {
    console.error('\nFailed to inscribe the configuration runes:', error);
    process.exit(1);
  }

  await printWithDelay('\nTHE GATES OF KHAZAD-DÛM STAND OPEN!');
  await printWithDelay('\nHEAR THE WORDS OF THE TUNNEL WARDENS:');
  await printWithDelay(
    '   - The tunnel shall manifest when the server awakens',
  );
  await printWithDelay('   - Watch for the sacred URL in your terminal');
  await printWithDelay('   - To seal the gates, mark ENABLE_TUNNEL as false\n');
  await printWithDelay('\nMay your code flow like rivers of mithril!\n');

  rl.close();
};

main().catch(console.error);
