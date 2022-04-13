module.exports = async ({ core, exec }) => {
  const fs = require('fs');
  const checkoutPageDir = "gh-pages"
  const checkoutSourceDir = "source"
  const helmVersionReplaceFiles = ['Chart.yaml', 'values.yaml']
  // TODO: NOTE: Updating version in Chart.yml and values.yml will work only for Chart.yaml as values.yaml doesn't have version as pointer in json (packageChart.js line 33)
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

      // Check if destination folder for chart exists
      if (!fs.existsSync(`${checkoutPageDir}/${chart.destination}`)) {
        core.notice(`Destination directory ${checkoutPageDir}/${chart.destination} doesn't exist\nCreating new directory: ${checkoutPageDir}/${chart.destination}`)
        fs.mkdirSync(`${checkoutPageDir}/${chart.destination}`)
      }

      if (chart.use_ref_as_version) {
        // Update the chart versionx
        const version = helm.ref.replace(new RegExp(chart.use_ref_as_version.pattern), chart.use_ref_as_version.replacement)
        core.notice(`Packaging the ${chart.name} chart with the version ${version}`)
        try {
          for (const file of helmVersionReplaceFiles) {
            core.debug(`${checkoutSourceDir}/${chart.source}/${file}`)
            await exec.exec('yq', ['-i', `.version = "${version}"`, `${checkoutSourceDir}/${chart.source}/${file}`])
          }
        } catch (error) {
          core.notice(`${checkoutSourceDir}/${chart.source}/${file}\n Version: ${version}`)
          return core.setFailed(`The file ${checkoutSourceDir}/${chart.source}/${file} doesn't exist\n${error}`);
        }

        await exec.exec('helm', ['package', `${checkoutSourceDir}/${chart.source}`, '-d', `${checkoutPageDir}/${chart.destination}`])
      } else {
        core.notice(`Packaging the chart ${chart.name}`)
        await exec.exec('helm', ['package', `${checkoutSourceDir}/${chart.source}`, '-d', `${checkoutPageDir}/${chart.destination}`])
      }

      await exec.exec('git', ['status'], { cwd: checkoutPageDir })
      // Show other (i.e. untracked) files in the output
      await exec.exec('git', ['ls-files', '--others', '--exclude-standard'],  {
        cwd: checkoutPageDir,
        listeners: { 'stdout': data => { changedFiles.push(data.toString().trim()) }}
      })

      await exec.exec('git', ['add', `${chart.destination}`], { cwd: checkoutPageDir })
      await exec.exec('git', ['status'], { cwd: checkoutPageDir })


    }
  } catch (error) {
    console.error(error);
    return core.setFailed(`Unable to update the version and stage files with error: ${error}`)
  }

  const gitStagedFiles = []
  // Show only modified  files in the output
  await exec.exec('git', ['diff', '--name-only', '--cached', '--patch-with-raw'], {
    cwd: checkoutPageDir,
    listeners: { 'stdout': data => { gitStagedFiles.push(data.toString().trim()) }}
  })

  if (JSON.stringify(gitStagedFiles.sort()) != JSON.stringify(changedFiles.sort())){
      return core.setFailed(`Only expected files to be added, but that's not the case\n==> Git staged files:${gitStagedFiles}\n==> Changed files:${changedFiles}`)
  }

}