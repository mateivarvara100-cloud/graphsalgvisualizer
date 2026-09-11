def run_bfs(graph, start_node, is_directed=False):
    animation_steps = []
    visited = set()
    distance = {}
    parent = {}
    queue = []
    time_counter = [0]
    discovery = {}
    finish = {}

    for node in graph:
        distance[node] = None
        parent[node] = None
        discovery[node] = None
        finish[node] = None

    time_counter[0] += 1
    discovery[start_node] = time_counter[0]
    distance[start_node] = 0
    visited.add(start_node)

    animation_steps.append({
        "action": "init_source",
        "node": start_node,
        "line": 4,
        "queue_state": [],
        "distances": dict(distance),
        "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
    })

    queue.append(start_node)
    animation_steps.append({
        "action": "enqueue_node",
        "node": start_node,
        "line": 8,
        "queue_state": list(queue),
        "distances": dict(distance),
        "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
    })

    while queue:
        u = queue.pop(0)

        animation_steps.append({
            "action": "visit_node",
            "node": u,
            "line": 10,
            "queue_state": list(queue),
            "distances": dict(distance),
            "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
        })

        for v in graph.get(u, []):
            if not is_directed and v == parent.get(u):
                continue

            animation_steps.append({
                "action": "check_edge",
                "u": u,
                "v": v,
                "line": 11,
                "queue_state": list(queue),
                "distances": dict(distance),
                "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
            })

            if v not in visited:
                time_counter[0] += 1
                discovery[v] = time_counter[0]
                visited.add(v)
                distance[v] = distance[u] + 1
                parent[v] = u

                animation_steps.append({
                    "action": "traverse_edge",
                    "u": u,
                    "v": v,
                    "edge_type": "tree",
                    "edge_symbol": "T",
                    "line": 12,
                    "queue_state": list(queue),
                    "distances": dict(distance),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })

                animation_steps.append({
                    "action": "discover_node",
                    "node": v,
                    "line": 13,
                    "queue_state": list(queue),
                    "distances": dict(distance),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })

                queue.append(v)
                animation_steps.append({
                    "action": "enqueue_node",
                    "node": v,
                    "line": 16,
                    "queue_state": list(queue),
                    "distances": dict(distance),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })
            else:
                if not is_directed:
                    edge_type = "cross"
                    edge_symbol = "C"
                    code_line = 20
                else:
                    is_ancestor = False
                    curr = parent.get(u)
                    while curr is not None:
                        if curr == v:
                            is_ancestor = True
                            break
                        curr = parent.get(curr)

                    if is_ancestor:
                        edge_type = "back"
                        edge_symbol = "B"
                        code_line = 17
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
                    "queue_state": list(queue),
                    "distances": dict(distance),
                    "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
                })

        time_counter[0] += 1
        finish[u] = time_counter[0]

        animation_steps.append({
            "action": "finish_node",
            "node": u,
            "line": 23,
            "queue_state": list(queue),
            "distances": dict(distance),
            "timestamps": {n: {"d": discovery.get(n), "f": finish.get(n)} for n in graph},
        })

    return animation_steps