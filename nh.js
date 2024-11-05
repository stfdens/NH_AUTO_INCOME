const puppeteer = require("puppeteer");
const env = require("dotenv");

env.config();

function logTimeUntilNextRun(nextRunTime) {
  const interval = setInterval(() => {
    const now = new Date();
    const timeLeft = nextRunTime - now;

    if (timeLeft <= 0) {
      clearInterval(interval);
    } else {
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      process.stdout.write(
        `Waktu tersisa hingga scraping berikutnya: ${hours} jam, ${minutes} menit, ${seconds} detik\r`
      );
    }
  }, 1000); // Update setiap detik
}

async function startScraping() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://kageherostudio.com/event/?event=daily");

  await page.locator(".btn-login").click();

  console.log("BOT IS RUNNING.......");

  // Login
  await page.waitForSelector('input[name="txtuserid"]', { visible: true });
  await page.type('input[name="txtuserid"]', `${process.env.EMAIL}`);

  await page.waitForSelector('input[name="txtpassword"]', { visible: true });
  await page.type('input[name="txtpassword"]', `${process.env.PASSWORD}`);

  await page.waitForSelector("#form-login-btnSubmit", { visible: true });
  await page.click("#form-login-btnSubmit");

  try {
    // Menunggu notifikasi sukses atau gagal
    const result = await Promise.race([
      page.waitForSelector('.alert-success span[data-notify="message"]', {
        visible: true,
        timeout: 10000,
      }),
      page.waitForSelector('.alert-danger span[data-notify="message"]', {
        visible: true,
        timeout: 10000,
      }),
    ]);

    // Mengecek apakah hasilnya berhasil atau gagal
    const message = await result.evaluate((el) => el.textContent);

    if (message === "Invalid userid / password [-1]") {
      console.log(message);
      return;
    } else if (message === "Login is successful") {
      console.log(message);

      // Reload halaman
      await page.reload({});

      // Cek keberadaan reward star
      const reward = await page.$(".reward-star");

      if (reward) {
        // Klik reward star lagi
        await page.locator(".reward-star").click();

        console.log(`konfirmasi server ${process.env.SERVER}`);
        await page.waitForSelector(".form-control", { visible: true });
        await page.select("select", `${process.env.SERVER}`);

        // Menangani dialog
        page.on("dialog", async (dialog) => {
          await dialog.accept();
        });

        // ambil hari claim
        const daysClaim = await page.$eval(
          ".reward-star .reward-point",
          (p) => p.textContent
        );

        console.log(`Claim reward star pada ${daysClaim}`);

        await page.locator("#form-server-btnSubmit").click({ delay: 3000 });
        console.log("Claim berhasil");

        await browser.close({ delay: 2000 });
      } else {
        console.log("Claim sudah dilakukan untuk hari ini");
        return;
      }
    }
  } catch (error) {
    console.log(
      "Tidak ada notifikasi yang muncul dalam waktu yang ditentukan."
    );
  }
}

function runScraper() {
  const nextRunTime = new Date(Date.now() + 23 * 60 * 60 * 1000); // 23 jam dari sekarang

  startScraping()
    .then(() => {
      logTimeUntilNextRun(nextRunTime); // Mulai menghitung waktu sisa
      setTimeout(runScraper, 23 * 60 * 60 * 1000); // 23 jam dalam milidetik
    })
    .catch((error) => {
      console.error("Terjadi kesalahan:", error);
      process.exit(1); // Keluar jika terjadi kesalahan
    });
}

// Memulai scraping pertama kali
runScraper();

//stfden on discord
