module.exports = async ({ core, exec }) => {
  const checkoutPageDir = "gh-pages"
  const helm = {
    owner: process.env.OWNER,
    repo: process.env.REPO,
    ref: process.env.REF,
    charts: JSON.parse(process.env.CHARTS)
  }

  const token = await fetchToken(helm, core)
  const headerToken_b64 = btoa(`x-access-token:${token}`)
  core.debug(headerToken_b64)

  try {
    // Verify status and set git config
    await exec.exec('git', ['remote', '-v'], { cwd: checkoutPageDir })
    await exec.exec('git', ['status'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', '--unset-all', 'http.https://github.com/.extraheader'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'http.https://github.com/.extraheader', `AUTHORIZATION: basic ${headerToken_b64}`], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'user.name', 'G-Research charts'], { cwd: checkoutPageDir })
    await exec.exec('git', ['config', '--local', 'user.email', 'charts@gr-oss.io'], { cwd: checkoutPageDir })

    // Update index
    await exec.exec('helm', ['repo', 'index', '.'], { cwd: checkoutPageDir })
    await exec.exec('git', ['add', 'index.yaml'], { cwd: checkoutPageDir })

    // Commit and push files
    await exec.exec('git', ['status'], { cwd: checkoutPageDir })
    await exec.exec('git', ['commit', '-m', `Publish helm chart ${helm.owner}/${helm.repo}@${checkoutPageDir}`, '--verbose'], { cwd: checkoutPageDir })
    await exec.exec('git', ['push', 'origin', checkoutPageDir, '--verbose'], { cwd: checkoutPageDir })
  } catch (error) {
    return core.setFailed(`Unable to push files from ${checkoutPageDir} to GitHub repo ${helm.owner}/${helm.repo} with ref: ${checkoutPageDir}.\nError: ${error}`)
  }

}


async function fetchToken(helm, core) {
  const { App } = require("octokit")
  const app = new App({
    appId: process.env.APP_ID,
    privateKey: process.env.APP_PRIVATE_KEY,
  })

  for await (const { data: installations } of app.octokit.paginate.iterator(
    app.octokit.rest.apps.listInstallations
  )) {
    for (const installation of installations) {
      if (installation.account.login === helm.owner) {
        const octokit = await app.getInstallationOctokit(installation.id)
        const { data: response } = await octokit.request('POST /app/installations/{installation_id}/access_tokens', {
          installation_id: installation.id,
          repositories: [`${helm.repo}`]
        })
        core.debug(response)
        return response.token
      }
    }
  }
}