/**
 * Docker API via dockerode – lists only safe-to-delete items:
 * dangling images, stopped containers, unused volumes, build cache.
 */
const Docker = require('dockerode');

function getDefaultSocket() {
  if (process.platform === 'win32') {
    return { socketPath: '//./pipe/docker_engine' };
  }
  return { socketPath: '/var/run/docker.sock' };
}

function isDanglingImage(img) {
  if (!img.RepoTags || img.RepoTags.length === 0) return true;
  const tag = String(img.RepoTags[0] || '');
  return tag === '<none>:<none>' || tag.startsWith('<none>:');
}

/**
 * @returns {Promise<{ path: string, size: number, category: string, description: string, dockerType: string, dockerId: string }[]>}
 */
async function getDockerFindings() {
  const docker = new Docker(getDefaultSocket());
  const out = [];

  try {
    const [df, containers] = await Promise.all([
      docker.df(),
      docker.listContainers({ all: true }).catch(() => []),
    ]);
    if (!df) return out;

    const stoppedIds = new Set(
      (containers || [])
        .filter((c) => (c.State || '').toLowerCase() !== 'running')
        .map((c) => c.Id)
    );
    const usedVolumeNames = new Set();
    for (const c of containers || []) {
      const mounts = c.Mounts || c.mounts || [];
      for (const m of mounts) {
        const name = m.Name || m.Destination;
        if (name) usedVolumeNames.add(name);
      }
    }

    // Images: only dangling (no tag / <none>:<none>)
    if (Array.isArray(df.Images)) {
      for (const img of df.Images) {
        if (!isDanglingImage(img)) continue;
        const name = (img.RepoTags && img.RepoTags[0]) || img.Id || 'unknown';
        const size = Number(img.Size) || 0;
        out.push({
          path: `image: ${name}`,
          size,
          category: 'Docker',
          description: 'Dangling image',
          dockerType: 'image',
          dockerId: img.Id,
        });
      }
    }

    // Containers: only stopped (exclude running)
    if (Array.isArray(df.Containers)) {
      for (const c of df.Containers) {
        const idMatch = stoppedIds.has(c.Id) || [...stoppedIds].some((sid) => c.Id.startsWith(sid) || sid.startsWith(c.Id));
        if (!idMatch) continue;
        const name = (c.Names && c.Names[0]) ? c.Names[0].replace(/^\//, '') : c.Id || 'unknown';
        const size = Number(c.SizeRw) + Number(c.SizeRootFs) || 0;
        if (size <= 0) continue;
        out.push({
          path: `container: ${name}`,
          size,
          category: 'Docker',
          description: 'Stopped container',
          dockerType: 'container',
          dockerId: c.Id,
        });
      }
    }

    // Volumes: only unused (not attached to any container)
    if (Array.isArray(df.Volumes)) {
      for (const v of df.Volumes) {
        const name = v.Name || 'unknown';
        if (usedVolumeNames.has(name)) continue;
        const size = (v.UsageData && Number(v.UsageData.Size)) || 0;
        out.push({
          path: `volume: ${name}`,
          size,
          category: 'Docker',
          description: 'Unused volume',
          dockerType: 'volume',
          dockerId: name,
        });
      }
    }

    // BuildCache: total size from API
    if (df.BuildCache && Array.isArray(df.BuildCache)) {
      let buildCacheSize = 0;
      for (const b of df.BuildCache) {
        buildCacheSize += Number(b.Size) || 0;
      }
      if (buildCacheSize > 0) {
        out.push({
          path: 'Build cache',
          size: buildCacheSize,
          category: 'Docker',
          description: 'Build cache',
          dockerType: 'buildcache',
          dockerId: '__buildcache__',
        });
      }
    }
  } catch (err) {
    // Docker not running or not installed – return empty, don’t throw
    if (process.env.DEBUG) console.error('Docker API:', err.message);
    return [];
  }

  return out;
}

/**
 * Remove a Docker resource by type and id.
 * @param {string} type - 'image' | 'container' | 'volume' | 'buildcache'
 * @param {string} id - Image ID, container ID, volume name, or '__buildcache__'
 */
async function removeDockerItem(type, id) {
  const docker = new Docker(getDefaultSocket());
  switch (type) {
    case 'image': {
      const img = docker.getImage(id);
      await img.remove({ force: true });
      return { deleted: true };
    }
    case 'container': {
      const c = docker.getContainer(id);
      await c.remove({ force: true });
      return { deleted: true };
    }
    case 'volume': {
      const v = docker.getVolume(id);
      await v.remove();
      return { deleted: true };
    }
    case 'buildcache': {
      await docker.pruneBuilder();
      return { deleted: true };
    }
    default:
      throw new Error(`Unknown Docker type: ${type}`);
  }
}

module.exports = { getDockerFindings, removeDockerItem };
