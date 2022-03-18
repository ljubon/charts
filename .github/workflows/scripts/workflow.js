module.exports = async ({ core, context }, token, owner, repo, ref, workflow_name) => {
  const { Octokit } = require("@octokit/core")
  const octokit = new Octokit({ auth: token })

  // TODO: change this to G-Research/charts
  const { data: repo_workflows } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows', {
    owner: owner,
    repo: repo,
  })

  // TODO: workflow name must be set to `Push`
  var push_workflow_id = ''
  for (const workflow of repo_workflows.workflows) {
    if (workflow.name == workflow_name) {
      push_workflow_id = workflow.id
    }
  }
  if (push_workflow_id == '') {
    core.setFailed(`Unable to find workflow called "Push" on ljubon/charts `)
  }

  try {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
      owner: owner,
      repo: repo,
      ref: ref,
      workflow_id: push_workflow_id,
      inputs: {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        ref: context.payload.ref
      },
    })
  } catch (error) {
    return core.setFailed(`Unable to trigger workflow dispatch on ${owner}/${repo}.\n${error}`)
  }

}