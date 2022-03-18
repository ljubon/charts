module.exports = async ({ core, glob, exec }) => {
  const fs = require('fs');
  const checkoutPageDir = "gh-pages"
  const checkoutSourceDir = "source"
  const helmVersionReplaceFiles = ['Chart.yaml', 'values.yaml']
  const changedFiles = []

  // Envs are set in  validate chart step
  const helm = {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    ref: process.env.REF,
    charts: JSON.parse(process.env.CHARTS)
  }
  core.debug(helm.charts)

  // Update chart version and stage files to git
  try {
    for (const chart of helm.charts) {

      // Check if source folder for chart exists  
      if (!fs.existsSync(`${checkoutSourceDir}/${chart.source}`)) {
        core.notice(chart)
        return core.setFailed(`Source directory ${checkoutSourceDir}/${chart.source} doesn't exist`);
      }

      if (chart.use_ref_as_version) {
        // Update the chart versionx
        const version = helm.ref.replace(new RegExp(chart.use_ref_as_version.pattern), chart.use_ref_as_version.replacement)
        try {
          for (const file of helmVersionReplaceFiles) {
            core.debug(`${checkoutSourceDir}/${chart.source}/${file}`)
            await exec.exec('yq', ['-i', `.version = "${version}"`, `${checkoutSourceDir}/${chart.source}/${file}`])
          }
        } catch (error) {
          core.notice(`${checkoutSourceDir}/${chart.source}/${file}\n Version: ${version}`)
          return core.setFailed(`The file ${checkoutSourceDir}/${chart.source}/${file} doesn't exist\n${error}`);
        }

        // Check if destination folder for chart exists
        if (!fs.existsSync(`${checkoutPageDir}/${chart.destination}`)) {
          return core.setFailed(`Destination directory ${checkoutPageDir}/${chart.destination} doesn't exist`)
        }
        await exec.exec('helm', ['package', `${checkoutSourceDir}/${chart.source}`, '-d', `${checkoutPageDir}/${chart.destination}`])

        const helmChart = `${chart.destination}/${chart.name}-${version}.tgz`
        changedFiles.push(helmChart)
        core.debug(changedFiles)
      }

      core.debug(chart)
      await exec.exec('git', ['status'], { cwd: checkoutPageDir })
      await exec.exec('git', ['add', `${chart.destination}/`], { cwd: checkoutPageDir })
      await exec.exec('git', ['status'], { cwd: checkoutPageDir })
    }
  } catch (error) {
    console.error(error);
    return core.setFailed(`Unable to update the version and stage files with error: ${error}`)
  }

  // Verify staged git files
  // Alternative could also be git status -s, and then compare files with changedFiles
  const gitStatus = [];
  await exec.exec('git', ['ls-files', '-m'], {
    cwd: checkoutPageDir,
    listeners: {
      'stdout': data => { gitStatus.push(data.toString()) }
    }
  })
  // TODO: match file names, not number changed of changed
  if (gitStatus.length > 0) {
    return core.setFailed(`Only expected files to be added, but that's not the case: ${gitStatus}`)
  }
  // core.notice(gitStatus)
  // core.notice(changedFiles)
  // gitStatus.forEach(file => {
  //   if (!changedFiles.includes(file)) {
  //     return core.setFailed(`Only expected files to be added, but that's not the case: ${gitStatus}`)
  //   }
  // });

}