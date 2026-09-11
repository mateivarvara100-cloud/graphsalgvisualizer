def run_dfs(graph, start_node="A", is_directed=False):
    animation_steps = []
    visited = set()
    time_counter = [0]
    discovery = {}
    finish = {}
    stack_trace = []

    nodes = list(graph.keys())
    if start_node in nodes:
        nodes.remove(start_node)
        nodes = [start_node] + nodes

    def dfs_visit(u, parent=None):
        visited.add(u)
        time_counter[0] += 1
        discovery[u] = time_counter[0]
        stack_trace.append(u)

        animation_steps.append({
            "action": "visit_node",
            "node": u,
            "line": 11,
            "stack_state": list(stack_trace),
            "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
        })

        for v in graph.get(u, []):
            if not is_directed and v == parent:
                continue

            animation_steps.append({
                "action": "check_edge",
                "u": u,
                "v": v,
                "line": 12,
                "stack_state": list(stack_trace),
                "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
            })

            if v not in visited:
                animation_steps.append({
                    "action": "traverse_edge",
                    "u": u,
                    "v": v,
                    "edge_type": "tree",
                    "edge_symbol": "T",
                    "line": 13,
                    "stack_state": list(stack_trace),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })

                dfs_visit(v, parent=u)

                animation_steps.append({
                    "action": "backtrack",
                    "node": u,
                    "line": 12,
                    "stack_state": list(stack_trace),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })
            else:
                if not is_directed:
                    edge_type = "back"
                    edge_symbol = "B"
                    code_line = 16
                else:
                    if v in stack_trace:
                        edge_type = "back"
                        edge_symbol = "B"
                        code_line = 16
                    elif discovery.get(u, 0) < discovery.get(v, 0):
                        edge_type = "forward"
                        edge_symbol = "F"
                        code_line = 18
                    else:
                        edge_type = "cross"
                        edge_symbol = "C"
                        code_line = 20

                animation_steps.append({
                    "action": "skip_edge",
                    "u": u,
                    "v": v,
                    "edge_type": edge_type,
                    "edge_symbol": edge_symbol,
                    "line": code_line,
                    "stack_state": list(stack_trace),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })

        time_counter[0] += 1
        finish[u] = time_counter[0]
        stack_trace.pop()

        animation_steps.append({
            "action": "finish_node",
            "node": u,
            "line": 22,
            "stack_state": list(stack_trace),
            "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
        })

    for u in nodes:
        if u not in visited:
            dfs_visit(u, parent=None)

    return animation_steps