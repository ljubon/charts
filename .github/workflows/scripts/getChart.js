module.exports = async ({ core }) => {
  const config = require('./config.json')
  const { owner, repo, ref } = JSON.parse(process.env.INPUTS_JSON)

}




/*
  
  const source = config.sources.find(source => {
    return source.owner === owner && source.repo == repo
  })
  if (source === undefined) {
    return core.setFailed(`Config not found for source ${owner}/${repo}`)
  }
  const found = source.refs.some(r => {
    if (r.type === 'regex') {
      const regex = new RegExp(r.ref)
      return regex.test(ref)
    }
    return r.ref === ref
  })
  if (!found) {
    return core.setFailed(`Ref ${ref} is not allowed for source ${owner}/${repo}`)
  }
  return source.charts

**/