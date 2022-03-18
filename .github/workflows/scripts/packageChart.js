module.exports = async ({ core, glob, exec }) => {
  const checkoutPageDir = "gh-pages"
  const checkoutSourceDir = "source"
  const helmVersionReplaceFiles = ['Chart.yaml', 'values.yaml']
  const helm = {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    ref: process.env.REF,
    charts: JSON.parse(process.env.CHARTS)
  }

  // Update chart version and stage files to git
  try {
    for (const chart of helm.charts) {
      const globber = await glob.create(`${checkoutSourceDir}/${chart.source}`, { implicitDescendants: false })
      for await (const source of globber.globGenerator()) {
        if (chart.use_ref_as_version) {
          const version = ref.replace(new RegExp(chart.use_ref_as_version.pattern), chart.use_ref_as_version.replacement)
          for (const file of helmVersionReplaceFiles) {
            await exec.exec('yq', ['-i', `.version = "${version}"`, `${source}/${file}`])
          }
        }
        await exec.exec('helm', ['package', source, '-d', `${checkoutPageDir}/${chart.destination}`])
      }
      await exec.exec('git', ['add', chart.destination], { cwd: checkoutPageDir })
    }
  } catch (error) {
    console.error(error);
    return core.setFailed(`Unable to update the version and stage files with error: ${error}`)
  }

  // Verify staged git files
  let status = '';
  await exec.exec('git', ['status', '--porcelain=v1'], {
    cwd: checkoutPageDir,
    listeners: {
      'stdout': data => {
        status += data.toString()
      }
    }
  })

  core.notice(status)
  for (const line of status.split('\n')) {
    if (line.length > 0 && !line.startsWith('A')) {
      return core.setFailed(`Only expected files to be added, but that's not the case: ${line}`)
    } else {
      console.log(line)
    }
  }
  console.log("Helm charts successfully packaged and staged to git")
}