TARJAN_LINES = {
    'init':         1,
    'outer_loop':   8,
    'call_sc':      10,
    'visit':        11,
    'for_neighbor': 15,
    'tree_edge':    17,
    'update_low':   18,
    'back_edge':    20,
    'check_root':   21,
    'pop_scc':      24,
    'until':        27,
}

SCC_PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

def run_tarjan(graph):
    animation_steps = []
    nodes = sorted(list(graph.keys()))
    if not nodes:
        return []

    index_counter = [0]
    indices = {}
    lowlink = {}
    stack = []
    on_stack = set()
    scc_id = 0
    scc_colors = {}
    scc_components = []

    node_state = {v: 'white' for v in nodes}

    def get_indices_snapshot():
        return {v: indices.get(v, None) for v in nodes}

    def get_lowlinks_snapshot():
        return {v: lowlink.get(v, None) for v in nodes}

    def get_stack_snapshot():
        return list(stack)

    animation_steps.append({
        'action': 'init',
        'line': TARJAN_LINES['init'],
        'node_states': dict(node_state),
        'indices': get_indices_snapshot(),
        'lowlinks': get_lowlinks_snapshot(),
        'scc_colors': {},
        'scc_list': [],
        'tarjan_stack': [],
    })

    def strongconnect(u):
        nonlocal scc_id
        indices[u] = index_counter[0]
        lowlink[u] = index_counter[0]
        index_counter[0] += 1
        stack.append(u)
        on_stack.add(u)
        node_state[u] = 'gray'

        animation_steps.append({
            'action': 'visit_node',
            'line': TARJAN_LINES['visit'],
            'node': u,
            'index': indices[u],
            'lowlink': lowlink[u],
            'indices': get_indices_snapshot(),
            'lowlinks': get_lowlinks_snapshot(),
            'node_states': dict(node_state),
            'scc_colors': dict(scc_colors),
            'scc_list': list(scc_components),
            'tarjan_stack': get_stack_snapshot(),
        })

        for v in sorted(graph.get(u, [])):
            animation_steps.append({
                'action': 'check_edge',
                'line': TARJAN_LINES['for_neighbor'],
                'u': u,
                'v': v,
                'indices': get_indices_snapshot(),
                'lowlinks': get_lowlinks_snapshot(),
                'node_states': dict(node_state),
                'scc_colors': dict(scc_colors),
                'scc_list': list(scc_components),
                'tarjan_stack': get_stack_snapshot(),
            })

            if v not in indices:
                strongconnect(v)
                lowlink[u] = min(lowlink[u], lowlink[v])

                animation_steps.append({
                    'action': 'update_lowlink',
                    'line': TARJAN_LINES['update_low'],
                    'node': u,
                    'neighbor': v,
                    'lowlink': lowlink[u],
                    'indices': get_indices_snapshot(),
                    'lowlinks': get_lowlinks_snapshot(),
                    'node_states': dict(node_state),
                    'scc_colors': dict(scc_colors),
                    'scc_list': list(scc_components),
                    'tarjan_stack': get_stack_snapshot(),
                })
            elif v in on_stack:
                lowlink[u] = min(lowlink[u], indices[v], lowlink[v])
                animation_steps.append({
                    'action': 'back_edge',
                    'line': TARJAN_LINES['back_edge'],
                    'node': u,
                    'u': u,
                    'v': v,
                    'lowlink': lowlink[u],
                    'indices': get_indices_snapshot(),
                    'lowlinks': get_lowlinks_snapshot(),
                    'node_states': dict(node_state),
                    'scc_colors': dict(scc_colors),
                    'scc_list': list(scc_components),
                    'tarjan_stack': get_stack_snapshot(),
                })

        if lowlink[u] == indices[u]:
            scc_id += 1
            color = SCC_PALETTE[(scc_id - 1) % len(SCC_PALETTE)]
            scc_members = []

            animation_steps.append({
                'action': 'check_scc_root',
                'line': TARJAN_LINES['check_root'],
                'node': u,
                'indices': get_indices_snapshot(),
                'lowlinks': get_lowlinks_snapshot(),
                'node_states': dict(node_state),
                'scc_colors': dict(scc_colors),
                'scc_list': list(scc_components),
                'tarjan_stack': get_stack_snapshot(),
            })

            while True:
                v = stack.pop()
                on_stack.remove(v)
                scc_colors[v] = color
                node_state[v] = 'black'
                scc_members.append(v)
                is_last = (v == u)

                animation_steps.append({
                    'action': 'scc_pop',
                    'line': TARJAN_LINES['until'] if is_last else TARJAN_LINES['pop_scc'],
                    'node': v,
                    'scc_root': u,
                    'scc_id': scc_id,
                    'scc_members': list(scc_members),
                    'color': color,
                    'indices': get_indices_snapshot(),
                    'lowlinks': get_lowlinks_snapshot(),
                    'node_states': dict(node_state),
                    'scc_colors': dict(scc_colors),
                    'scc_list': list(scc_components),
                    'tarjan_stack': get_stack_snapshot(),
                })
                if is_last:
                    break

            scc_components.append({
                'id': scc_id,
                'color': color,
                'members': sorted(scc_members),
                'root': u
            })

    for node in nodes:
        if node not in indices:
            strongconnect(node)

    animation_steps.append({
        'action': 'done',
        'line': TARJAN_LINES['until'],
        'total_sccs': scc_id,
        'indices': get_indices_snapshot(),
        'lowlinks': get_lowlinks_snapshot(),
        'node_states': dict(node_state),
        'scc_colors': dict(scc_colors),
        'scc_list': list(scc_components),
        'tarjan_stack': [],
    })

    return animation_steps