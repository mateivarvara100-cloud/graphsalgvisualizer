FLOYD_LINES = {
    'init':       1,
    'outer_k':    2,
    'inner_i':    3,
    'inner_j':    4,
    'check':      5,
    'update':     6,
    'done':       7,
}

def run_floyd_warshall(graph, vertices=None):
    animation_steps = []

    if isinstance(graph, dict):
        verts = list(graph.keys())
        edge_map = {}
        for u in verts:
            for v, w in graph[u].items():
                edge_map[(u, v)] = w
    else:
        verts = vertices or []
        edge_map = {}

    dist = {i: {j: float('inf') for j in verts} for i in verts}
    for v in verts:
        dist[v][v] = 0
    for (u, v), w in edge_map.items():
        dist[u][v] = w

    def snapshot():
        return {u: {v: (dist[u][v] if dist[u][v] != float('inf') else None)
                    for v in verts} for u in verts}

    animation_steps.append({
        'action': 'init',
        'line': FLOYD_LINES['init'],
        'dist_matrix': snapshot(),
        'active_nodes': [],
    })

    for k in verts:
        animation_steps.append({
            'action': 'outer_k',
            'line': FLOYD_LINES['outer_k'],
            'k': k,
            'dist_matrix': snapshot(),
            'active_nodes': [k],
        })

        for i in verts:
            animation_steps.append({
                'action': 'inner_i',
                'line': FLOYD_LINES['inner_i'],
                'k': k,
                'i': i,
                'dist_matrix': snapshot(),
                'active_nodes': [k, i],
            })

            for j in verts:
                animation_steps.append({
                    'action': 'check_path',
                    'line': FLOYD_LINES['check'],
                    'k': k,
                    'i': i,
                    'j': j,
                    'u': i,
                    'v': j,
                    'dist_matrix': snapshot(),
                    'active_nodes': [k, i, j],
                })

                if dist[i][k] != float('inf') and dist[k][j] != float('inf'):
                    if dist[i][j] > dist[i][k] + dist[k][j]:
                        dist[i][j] = dist[i][k] + dist[k][j]
                        animation_steps.append({
                            'action': 'update_dist',
                            'line': FLOYD_LINES['update'],
                            'k': k,
                            'i': i,
                            'j': j,
                            'u': i,
                            'v': j,
                            'new_dist': dist[i][j],
                            'dist_matrix': snapshot(),
                            'active_nodes': [k, i, j],
                        })

    neg_cycle_nodes = [v for v in verts if dist[v][v] < 0]
    has_neg_cycle = len(neg_cycle_nodes) > 0

    if has_neg_cycle:
        animation_steps.append({
            'action': 'negative_cycle',
            'line': FLOYD_LINES['done'],
            'k': None,
            'i': neg_cycle_nodes[0],
            'j': neg_cycle_nodes[0],
            'dist_matrix': snapshot(),
            'active_nodes': neg_cycle_nodes,
            'has_negative_cycle': True,
            'negative_cycle_nodes': neg_cycle_nodes,
            'message': f"Negative cycle detected! Vertex '{neg_cycle_nodes[0]}' has dist[{neg_cycle_nodes[0]}][{neg_cycle_nodes[0]}] = {dist[neg_cycle_nodes[0]][neg_cycle_nodes[0]]} < 0. Shortest paths do not mathematically exist because infinite looping lowers the cost.",
        })

    animation_steps.append({
        'action': 'done',
        'line': FLOYD_LINES['done'],
        'dist_matrix': snapshot(),
        'active_nodes': neg_cycle_nodes if has_neg_cycle else [],
        'has_negative_cycle': has_neg_cycle,
        'negative_cycle_nodes': neg_cycle_nodes,
    })

    return animation_steps