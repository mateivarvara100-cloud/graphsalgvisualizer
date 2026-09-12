KOSARAJU_LINES = {
    'init':          1,
    'dfs1_loop':     2,
    'dfs1_visit':    3,
    'dfs1_recurse':  4,
    'dfs1_push':     5,
    'transpose':     6,
    'dfs2_loop':     7,
    'dfs2_visit':    8,
    'scc_found':     9,
}

SCC_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

def run_kosaraju(graph):
    animation_steps = []
    nodes = sorted(list(graph.keys()))
    if not nodes:
        return []

    visited = set()
    finish_stack = []
    discovery = {}
    finish = {}
    time_counter = [0]

    node_state = {v: 'white' for v in nodes}
    scc_colors = {}
    scc_components = []

    def get_timestamps():
        return {n: {'d': discovery.get(n), 'f': finish.get(n)} for n in nodes}

    animation_steps.append({
        'action': 'init',
        'line': KOSARAJU_LINES['init'],
        'node_states': dict(node_state),
        'timestamps': get_timestamps(),
        'finish_stack': [],
        'scc_colors': {},
        'scc_list': [],
        'phase': 1,
    })

    def dfs1(u):
        visited.add(u)
        time_counter[0] += 1
        discovery[u] = time_counter[0]
        node_state[u] = 'gray'

        animation_steps.append({
            'action': 'dfs1_visit',
            'line': KOSARAJU_LINES['dfs1_recurse'],
            'node': u,
            'node_states': dict(node_state),
            'timestamps': get_timestamps(),
            'finish_stack': list(finish_stack),
            'scc_colors': {},
            'scc_list': [],
            'phase': 1,
        })

        for v in sorted(graph.get(u, [])):
            animation_steps.append({
                'action': 'check_edge',
                'line': KOSARAJU_LINES['dfs1_recurse'],
                'u': u,
                'v': v,
                'node_states': dict(node_state),
                'timestamps': get_timestamps(),
                'finish_stack': list(finish_stack),
                'scc_colors': {},
                'scc_list': [],
                'phase': 1,
            })
            if v not in visited:
                animation_steps.append({
                    'action': 'traverse_edge',
                    'line': KOSARAJU_LINES['dfs1_recurse'],
                    'u': u,
                    'v': v,
                    'node_states': dict(node_state),
                    'timestamps': get_timestamps(),
                    'finish_stack': list(finish_stack),
                    'scc_colors': {},
                    'scc_list': [],
                    'phase': 1,
                })
                dfs1(v)

        time_counter[0] += 1
        finish[u] = time_counter[0]
        finish_stack.append(u)
        node_state[u] = 'black'

        animation_steps.append({
            'action': 'dfs1_finish',
            'line': KOSARAJU_LINES['dfs1_push'],
            'node': u,
            'finish_stack': list(finish_stack),
            'node_states': dict(node_state),
            'timestamps': get_timestamps(),
            'scc_colors': {},
            'scc_list': [],
            'phase': 1,
        })

    for node in nodes:
        if node not in visited:
            animation_steps.append({
                'action': 'dfs1_check_unvisited',
                'line': KOSARAJU_LINES['dfs1_visit'],
                'node': node,
                'node_states': dict(node_state),
                'timestamps': get_timestamps(),
                'finish_stack': list(finish_stack),
                'scc_colors': {},
                'scc_list': [],
                'phase': 1,
            })
            dfs1(node)

    transposed = {node: [] for node in nodes}
    for u in nodes:
        for v in graph.get(u, []):
            transposed[v].append(u)

    node_state2 = {v: 'white' for v in nodes}

    animation_steps.append({
        'action': 'transpose',
        'line': KOSARAJU_LINES['transpose'],
        'finish_stack': list(finish_stack),
        'node_states': dict(node_state2),
        'timestamps': get_timestamps(),
        'scc_colors': {},
        'scc_list': [],
        'phase': 2,
    })

    visited2 = set()
    scc_count = 0

    def dfs2(u, current_scc_id, current_color, current_members):
        visited2.add(u)
        node_state2[u] = 'black'
        scc_colors[u] = current_color
        current_members.append(u)

        animation_steps.append({
            'action': 'dfs2_visit',
            'line': KOSARAJU_LINES['dfs2_visit'],
            'node': u,
            'scc_id': current_scc_id,
            'color': current_color,
            'node_states': dict(node_state2),
            'scc_colors': dict(scc_colors),
            'scc_list': list(scc_components),
            'finish_stack': list(finish_stack),
            'timestamps': get_timestamps(),
            'phase': 2,
        })

        for v in sorted(transposed.get(u, [])):
            animation_steps.append({
                'action': 'check_edge',
                'line': KOSARAJU_LINES['dfs2_visit'],
                'u': u,
                'v': v,
                'orig_u': v,
                'orig_v': u,
                'node_states': dict(node_state2),
                'scc_colors': dict(scc_colors),
                'scc_list': list(scc_components),
                'finish_stack': list(finish_stack),
                'timestamps': get_timestamps(),
                'phase': 2,
            })
            if v not in visited2:
                animation_steps.append({
                    'action': 'traverse_edge',
                    'line': KOSARAJU_LINES['dfs2_visit'],
                    'u': u,
                    'v': v,
                    'orig_u': v,
                    'orig_v': u,
                    'color': current_color,
                    'scc_id': current_scc_id,
                    'node_states': dict(node_state2),
                    'scc_colors': dict(scc_colors),
                    'scc_list': list(scc_components),
                    'finish_stack': list(finish_stack),
                    'timestamps': get_timestamps(),
                    'phase': 2,
                })
                dfs2(v, current_scc_id, current_color, current_members)

    while finish_stack:
        popped_node = finish_stack.pop()

        animation_steps.append({
            'action': 'dfs2_pop',
            'line': KOSARAJU_LINES['dfs2_loop'],
            'node': popped_node,
            'finish_stack': list(finish_stack),
            'node_states': dict(node_state2),
            'scc_colors': dict(scc_colors),
            'scc_list': list(scc_components),
            'timestamps': get_timestamps(),
            'phase': 2,
        })

        if popped_node in visited2:
            animation_steps.append({
                'action': 'dfs2_already_visited',
                'line': KOSARAJU_LINES['dfs2_visit'],
                'node': popped_node,
                'finish_stack': list(finish_stack),
                'node_states': dict(node_state2),
                'scc_colors': dict(scc_colors),
                'scc_list': list(scc_components),
                'timestamps': get_timestamps(),
                'phase': 2,
            })
            continue

        scc_count += 1
        color = SCC_PALETTE[(scc_count - 1) % len(SCC_PALETTE)]
        members = []

        dfs2(popped_node, scc_count, color, members)

        scc_components.append({
            'id': scc_count,
            'color': color,
            'members': sorted(members)
        })

        animation_steps.append({
            'action': 'scc_complete',
            'line': KOSARAJU_LINES['scc_found'],
            'scc_id': scc_count,
            'scc_members': sorted(members),
            'color': color,
            'node_states': dict(node_state2),
            'scc_colors': dict(scc_colors),
            'scc_list': list(scc_components),
            'finish_stack': list(finish_stack),
            'timestamps': get_timestamps(),
            'phase': 2,
        })

    animation_steps.append({
        'action': 'done',
        'line': KOSARAJU_LINES['scc_found'],
        'total_sccs': scc_count,
        'scc_list': list(scc_components),
        'node_states': dict(node_state2),
        'scc_colors': dict(scc_colors),
        'finish_stack': [],
        'timestamps': get_timestamps(),
        'phase': 2,
    })

    return animation_steps