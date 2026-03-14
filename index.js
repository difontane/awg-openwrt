const axios = require('axios');
const cheerio = require('cheerio');
const core = require('@actions/core');

const version = process.argv[2]; // Версия OpenWRT
const filterTargetsStr = process.argv[3] || ''; // target
const filterSubtargetsStr = process.argv[4] || ''; // subtarget
const customVermagic = process.argv[5] || ''; // vermagic - теперь обязательный параметр!

if (!version) {
  core.setFailed('Version argument is required');
  process.exit(1);
}

if (!customVermagic) {
  core.setFailed('Vermagic argument is required for specific kernel build');
  process.exit(1);
}

// Преобразуем строки с запятыми в массивы
const filterTargets = filterTargetsStr ? filterTargetsStr.split(',').map(t => t.trim()).filter(t => t) : [];
const filterSubtargets = filterSubtargetsStr ? filterSubtargetsStr.split(',').map(s => s.trim()).filter(s => s) : [];

// Функция для получения HTML
async function fetchHTML(url) {
  try {
    const { data } = await axios.get(url);
    return cheerio.load(data);
  } catch (error) {
    console.error(`Error fetching HTML for ${url}: ${error}`);
    throw error;
  }
}

async function main() {
  try {
    // Если переданы конкретные target и subtarget
    if (filterTargets.length === 1 && filterSubtargets.length === 1) {
      const target = filterTargets[0];
      const subtarget = filterSubtargets[0];
      
      console.log(`Building for specific target: ${target}/${subtarget}`);
      console.log(`Using custom vermagic: ${customVermagic}`);
      
      // Получаем pkgarch из index.json
      const url = `https://downloads.openwrt.org/releases/${version}/targets/`;
      const indexUrl = `${url}${target}/${subtarget}/packages/index.json`;
      
      let pkgarch = '';
      try {
        const { data } = await axios.get(indexUrl, { responseType: 'json' });
        pkgarch = data.architecture || '';
        console.log(`Detected pkgarch: ${pkgarch}`);
      } catch (e) {
        console.log(`Could not detect pkgarch for ${target}/${subtarget}, will be empty`);
      }

      // Создаем конфигурацию с нашим vermagic
      const jobConfig = [{
        tag: version,
        target,
        subtarget,
        vermagic: customVermagic, // Используем переданный vermagic
        pkgarch,
      }];
      
      console.log('Job config created:', JSON.stringify(jobConfig, null, 2));
      core.setOutput('job-config', JSON.stringify(jobConfig));
    } 
    else {
      // Если параметры не указаны - получаем все возможные комбинации
      console.log('No specific target/subtarget provided, scanning all targets...');
      
      const targetsUrl = `https://downloads.openwrt.org/releases/${version}/targets/`;
      const $ = await fetchHTML(targetsUrl);
      
      const targets = [];
      $('table tr td.n a').each((index, element) => {
        const name = $(element).attr('href');
        if (name && name.endsWith('/')) {
          targets.push(name.slice(0, -1));
        }
      });

      const jobConfig = [];

      for (const target of targets) {
        if (filterTargets.length > 0 && !filterTargets.includes(target)) {
          continue;
        }

        const subtargetsUrl = `${targetsUrl}${target}/`;
        const $sub = await fetchHTML(subtargetsUrl);
        
        const subtargets = [];
        $sub('table tr td.n a').each((index, element) => {
          const name = $(element).attr('href');
          if (name && name.endsWith('/')) {
            subtargets.push(name.slice(0, -1));
          }
        });

        for (const subtarget of subtargets) {
          if (filterSubtargets.length > 0 && !filterSubtargets.includes(subtarget)) {
            continue;
          }

          // Получаем pkgarch
          const indexUrl = `${targetsUrl}${target}/${subtarget}/packages/index.json`;
          let pkgarch = '';
          try {
            const { data } = await axios.get(indexUrl, { responseType: 'json' });
            pkgarch = data.architecture || '';
          } catch (e) {
            // ignore
          }

          jobConfig.push({
            tag: version,
            target,
            subtarget,
            vermagic: customVermagic, // Используем один vermagic для всех
            pkgarch,
          });
        }
      }

      console.log(`Generated config for ${jobConfig.length} targets`);
      core.setOutput('job-config', JSON.stringify(jobConfig));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
