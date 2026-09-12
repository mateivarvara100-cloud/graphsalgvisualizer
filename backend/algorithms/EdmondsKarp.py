from collections import deque

EK_LINES = {
    'init':         1,
    'init_residual':2,
    'while_path':   3,
    'bfs':          4,
    'path_found':   5,
    'bottleneck':   6,
    'augment':      7,
    'done':         8,
}

def run_edmonds_karp(graph=None, vertices=None, source=None, sink=None, edges=None):
    animation_steps = []

    all_nodes = sorted(list(set(vertices or [])))
    if not all_nodes and isinstance(graph, dict):
        all_nodes = sorted(list(graph.keys()))

    if not all_nodes:
        return []

    if source not in all_nodes:
        source = all_nodes[0]
    if sink not in all_nodes or sink == source:
        sink = all_nodes[-1] if len(all_nodes) > 1 else all_nodes[0]

    capacity = {u: {v: 0 for v in all_nodes} for u in all_nodes}
    original_edges = set()

    if edges is not None:
        for e in edges:
            u = e.get('u') or e.get('source')
            v = e.get('v') or e.get('target')
            c = int(e.get('capacity', e.get('weight', 1)))
            capacity[u][v] += c
            original_edges.add((u, v))
    elif isinstance(graph, dict):
        for u in graph:
            for v, c in graph[u].items():
                capacity[u][v] += int(c)
                original_edges.add((u, v))

    adj = {v: set() for v in all_nodes}
    for u, v in original_edges:
        adj[u].add(v)
        adj[v].add(u)

    flow = {u: {v: 0 for v in all_nodes} for u in all_nodes}
    max_flow = 0

    def get_edge_flows():
        res = {}
        for u, v in original_edges:
            f = max(0, flow[u][v])
            c = capacity[u][v]
            res[f"{u}->{v}"] = {
                "u": u,
                "v": v,
                "flow": f,
                "capacity": c,
                "display": f"{f}/{c}",
                "saturated": f == c and c > 0
            }
        return res

    node_state = {v: 'white' for v in all_nodes}
    node_state[source] = 'gray'

    animation_steps.append({
        'action': 'init',
        'line': EK_LINES['init'],
        'source': source,
        'sink': sink,
        'max_flow': 0,
        'edge_flows': get_edge_flows(),
        'node_states': dict(node_state),
        'path': [],
        'path_str': '',
        'bottleneck': None,
        'iteration': 0,
    })

    iteration = 0
    MAX_FLOW_ITERATIONS = 1000

    while True:
        iteration += 1
        if iteration > MAX_FLOW_ITERATIONS:
            break

        animation_steps.append({
            'action': 'bfs_start',
            'line': EK_LINES['while_path'],
            'source': source,
            'sink': sink,
            'max_flow': max_flow,
            'edge_flows': get_edge_flows(),
            'node_states': {v: ('gray' if v == source else 'white') for v in all_nodes},
            'path': [],
            'path_str': '',
            'bottleneck': None,
            'iteration': iteration,
        })

        parent = {source: None}
        queue = deque([source])
        node_state_bfs = {v: 'white' for v in all_nodes}
        node_state_bfs[source] = 'gray'

        found_path = False

        while queue:
            u = queue.popleft()
            if u == sink:
                found_path = True
                break

            for v in sorted(adj.get(u, [])):
                residual = capacity[u][v] - flow[u][v]
                if v not in parent and residual > 0:
                    parent[v] = u
                    node_state_bfs[v] = 'gray'
                    queue.append(v)

                    animation_steps.append({
                        'action': 'check_edge',
                        'line': EK_LINES['bfs'],
                        'source': source,
                        'sink': sink,
                        'u': u,
                        'v': v,
                        'residual': residual,
                        'queue': list(queue),
                        'edge_flows': get_edge_flows(),
                        'node_states': dict(node_state_bfs),
                        'max_flow': max_flow,
                        'iteration': iteration,
                    })

                    if v == sink:
                        found_path = True
                        break

            if found_path:
                break

        if sink not in parent:
            break

        path = []
        curr = sink
        while curr != source:
            prev = parent[curr]
            path.insert(0, (prev, curr))
            curr = prev

        path_nodes = [source] + [edge[1] for edge in path]
        path_str = ' → '.join(path_nodes)

        path_flow = min(capacity[u][v] - flow[u][v] for u, v in path)
        if path_flow <= 0:
            break

        animation_steps.append({
            'action': 'path_found',
            'line': EK_LINES['path_found'],
            'source': source,
            'sink': sink,
            'path': [{'u': u, 'v': v} for u, v in path],
            'path_nodes': path_nodes,
            'path_str': path_str,
            'bottleneck': path_flow,
            'edge_flows': get_edge_flows(),
            'node_states': {v: ('gray' if v in path_nodes else 'white') for v in all_nodes},
            'max_flow': max_flow,
            'iteration': iteration,
        })

        animation_steps.append({
            'action': 'bottleneck',
            'line': EK_LINES['bottleneck'],
            'source': source,
            'sink': sink,
            'path': [{'u': u, 'v': v} for u, v in path],
            'path_nodes': path_nodes,
            'path_str': path_str,
            'bottleneck': path_flow,
            'edge_flows': get_edge_flows(),
            'node_states': {v: ('gray' if v in path_nodes else 'white') for v in all_nodes},
            'max_flow': max_flow,
            'iteration': iteration,
        })

        for u, v in path:
            flow[u][v] += path_flow
            flow[v][u] -= path_flow

            animation_steps.append({
                'action': 'augment_edge',
                'line': EK_LINES['augment'],
                'source': source,
                'sink': sink,
                'u': u,
                'v': v,
                'flow_added': path_flow,
                'edge_flows': get_edge_flows(),
                'path': [{'u': pu, 'v': pv} for pu, pv in path],
                'path_str': path_str,
                'bottleneck': path_flow,
                'node_states': {v: ('gray' if v in path_nodes else 'white') for v in all_nodes},
                'max_flow': max_flow,
                'iteration': iteration,
            })

        max_flow += path_flow

        animation_steps.append({
            'action': 'augmented',
            'line': EK_LINES['augment'],
            'source': source,
            'sink': sink,
            'path': [{'u': u, 'v': v} for u, v in path],
            'path_nodes': path_nodes,
            'path_str': path_str,
            'path_flow': path_flow,
            'bottleneck': path_flow,
            'max_flow': max_flow,
            'edge_flows': get_edge_flows(),
            'node_states': {v: ('black' if v in path_nodes else 'white') for v in all_nodes},
            'iteration': iteration,
        })

    cut_visited = set([source])
    cut_q = deque([source])
    while cut_q:
        u = cut_q.popleft()
        for v in sorted(adj.get(u, [])):
            if v not in cut_visited and (capacity[u][v] - flow[u][v]) > 0:
                cut_visited.add(v)
                cut_q.append(v)

    s_cut = sorted(list(cut_visited))
    t_cut = sorted([v for v in all_nodes if v not in cut_visited])

    saturated_edges = [
        {'u': u, 'v': v, 'capacity': capacity[u][v]}
        for u in s_cut for v in t_cut
        if capacity[u][v] > 0 and flow[u][v] == capacity[u][v]
    ]

    final_node_states = {v: ('black' if v in s_cut else 'gray') for v in all_nodes}

    animation_steps.append({
        'action': 'done',
        'line': EK_LINES['done'],
        'source': source,
        'sink': sink,
        'max_flow': max_flow,
        'min_cut_S': s_cut,
        'min_cut_T': t_cut,
        'saturated_edges': saturated_edges,
        'edge_flows': get_edge_flows(),
        'node_states': final_node_states,
        'path': [],
        'path_str': '',
        'bottleneck': None,
        'iteration': iteration,
    })

    return animation_steps
