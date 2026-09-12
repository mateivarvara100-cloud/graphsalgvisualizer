import heapq
import math

DIJKSTRA_LINES = {
    'init':         1,
    'set_dist_inf': 2,
    'set_start_0':  3,
    'init_pq':      3,
    'while_pq':     4,
    'extract_min':  [5, 6],
    'for_neighbor': 7,
    'check_relax':  [8, 9],
    'relax':        [10, 11],
    'done':         None,
}

def run_dijkstra(graph, start_node):
    animation_steps = []
    nodes = list(graph.keys())

    distances = {v: float('inf') for v in nodes}
    distances[start_node] = 0
    predecessors = {v: None for v in nodes}

    node_state = {v: 'white' for v in nodes}
    node_state[start_node] = 'gray'

    pq = [(0, start_node)]
    visited = set()

    def pq_snapshot():
        items = []
        for v in nodes:
            if v not in visited:
                d = distances[v]
                items.append({
                    'node': v,
                    'key': None if math.isinf(d) else d,
                    'key_display': '∞' if math.isinf(d) else str(d),
                    'pi': predecessors[v]
                })
        return sorted(items, key=lambda x: (float('inf') if x['key'] is None else x['key'], x['node']))

    def dist_snapshot():
        return {v: (str(distances[v]) if distances[v] != float('inf') else '∞') for v in nodes}

    animation_steps.append({
        'action': 'init',
        'line': DIJKSTRA_LINES['init'],
        'distances': dist_snapshot(),
        'predecessors': dict(predecessors),
        'pq': pq_snapshot(),
        'node_states': dict(node_state),
    })

    animation_steps.append({
        'action': 'set_dist_inf',
        'line': DIJKSTRA_LINES['set_dist_inf'],
        'predecessors': dict(predecessors),
        'distances': dist_snapshot(),
        'pq': pq_snapshot(),
    })

    animation_steps.append({
        'action': 'set_start_0',
        'line': DIJKSTRA_LINES['set_start_0'],
        'node': start_node,
        'predecessors': dict(predecessors),
        'distances': dist_snapshot(),
        'pq': pq_snapshot(),
        'node_states': dict(node_state),
    })

    while pq:
        animation_steps.append({
            'action': 'while_pq',
            'line': DIJKSTRA_LINES['while_pq'],
            'predecessors': dict(predecessors),
            'distances': dist_snapshot(),
            'pq': pq_snapshot(),
            'node_states': dict(node_state),
        })

        current_dist, u = heapq.heappop(pq)

        if u in visited:
            continue

        visited.add(u)
        node_state[u] = 'black'

        animation_steps.append({
            'action': 'extract_min',
            'line': DIJKSTRA_LINES['extract_min'],
            'node': u,
            'dist': current_dist,
            'predecessors': dict(predecessors),
            'distances': dist_snapshot(),
            'pq': pq_snapshot(),
            'node_states': dict(node_state),
        })

        for v, weight in graph.get(u, {}).items():
            animation_steps.append({
                'action': 'check_edge',
                'line': DIJKSTRA_LINES['for_neighbor'],
                'u': u,
                'v': v,
                'predecessors': dict(predecessors),
                'distances': dist_snapshot(),
                'pq': pq_snapshot(),
                'node_states': dict(node_state),
            })

            animation_steps.append({
                'action': 'check_relax',
                'line': DIJKSTRA_LINES['check_relax'],
                'u': u,
                'v': v,
                'predecessors': dict(predecessors),
                'distances': dist_snapshot(),
                'pq': pq_snapshot(),
                'node_states': dict(node_state),
            })

            if distances[v] > current_dist + weight:
                distances[v] = current_dist + weight
                predecessors[v] = u
                if v not in visited:
                    node_state[v] = 'gray'
                heapq.heappush(pq, (distances[v], v))

                animation_steps.append({
                    'action': 'relax_edge',
                    'line': DIJKSTRA_LINES['relax'],
                    'u': u,
                    'v': v,
                    'new_dist': distances[v],
                    'predecessors': dict(predecessors),
                    'distances': dist_snapshot(),
                    'pq': pq_snapshot(),
                    'node_states': dict(node_state),
                })

    shortest_tree = [{'u': predecessors[v], 'v': v} for v in nodes if predecessors[v] is not None]

    animation_steps.append({
        'action': 'done',
        'line': DIJKSTRA_LINES['done'],
        'predecessors': dict(predecessors),
        'distances': dist_snapshot(),
        'shortest_path_edges': shortest_tree,
        'pq': [],
        'node_states': dict(node_state),
    })

    return animation_steps