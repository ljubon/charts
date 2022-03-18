async function generateToken({ core, exec }) {
  const context = JSON.parse(process.env.GITHUB_CONTEXT)
  core.notice(context)

/* gh workflow run push.yaml \
      --repo ljubon/charts \
      --ref INTERNAL-master \
      -f owner=${{ github.event.repository.owner.login }} \
      -f repo = ${{ github.event.repository.name }} \
      -f ref = ${{ github.ref }}
*/
  

}