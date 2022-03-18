module.exports = async ({ core }) => {
  const source = new Map(Object.entries(require('./config.json')))
  const context = JSON.parse(process.env.GITHUB_CONTEXT)
  var input = (context.event_name == "workflow_dispatch") ? {
    owner: context.event.inputs.owner,
    repo: context.event.inputs.repo,
    ref: context.event.inputs.ref
  } : {
    owner: context.event.repository.owner.login,
    repo: context.event.repository.name,
    ref: context.ref
  }
  core.notice(input)

  // Verify that repo exists in the config
  const repo = Object.values(source.get(input.owner)).find(source => source.name == input.repo)
  if (!repo) {
    return core.setFailed(`Config not found for source ${input.owner}/${input.repo} with ref ${input.ref}`)
  }

  // Validate that ref is in expected format
  const validateRefs = repo.refs.some(r => {
    if (r.type == "regex") {
      const regex = new RegExp(r.ref)
      return regex.test(input.ref)
    } else if (r.type == "branch") {
      return r.ref == input.ref
    }
  })
  if (!validateRefs) {
    return core.setFailed(`Ref ${input.ref} is not allowed for source ${input.owner}/${input.repo}`)
  }

  core.exportVariable('REPO', input.repo)
  core.exportVariable('OWNER', input.owner)
  core.exportVariable('REF', input.ref)
  core.exportVariable('CHARTS', JSON.stringify(repo.helm_charts))
}