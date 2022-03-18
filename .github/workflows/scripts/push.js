module.exports = async ({ core, exec }, token) => {
  const checkoutPageDir = "gh-pages"
  const helm = {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    ref: process.env.REF,
    charts: JSON.parse(process.env.CHARTS)
  }

  const headerToken_b64 = btoa(`x-access-token:${token}`) // TODO: chek if we can use buf.toString('base64') (docc)
  core.debug(headerToken_b64)

  try {
    // Verify status and set git config
    await exec.exec('git', ['remote', '-v'], { cwd: checkoutPageDir })
    await exec.exec('git', ['status'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', '--unset-all', 'http.https://github.com/.extraheader'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'http.https://github.com/.extraheader', `::add-mask::AUTHORIZATION: basic ${headerToken_b64}`], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'user.name', 'G-Research charts'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'user.email', 'charts@gr-oss.io'], { cwd: checkoutPageDir })

    // Update index and stage charts
    await exec.exec('helm', ['repo', 'index', '.'], { cwd: checkoutPageDir })
    await exec.exec('git', ['add', 'index.yaml'], { cwd: checkoutPageDir })
    for (const chart of helm.charts) {
      await exec.exec('git', ['add', `${chart.destination}`], { cwd: checkoutPageDir })
    };

    // Commit and push files
    await exec.exec('git', ['status'], { cwd: checkoutPageDir })
    await exec.exec('git', ['commit', '-m', `Publish helm chart to ljubon/charts`, '--verbose'], { cwd: checkoutPageDir }) // TODO: pull out ljubon/chart from github context owner/repo
    await exec.exec('git', ['push', 'origin', checkoutPageDir, '--verbose'], { cwd: checkoutPageDir })
  } catch (error) {
    return core.setFailed(`Unable to push ${checkoutPageDir}/${helm.charts.destination} to ljubon/charts@${checkoutPageDir}\nError: ${error}`)
  }

  // TODO: uninstall token https://docs.github.com/en/rest/reference/apps#revoke-an-installation-access-token
  // suspend generated token 

}
