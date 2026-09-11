import math

def run_prim(graph=None, start_node="A", edges_input=None):
    animation_steps = []
    
    adj = {}
    vertices = set()
    edge_weights = {}

    if edges_input:
        for e in edges_input:
            u = e.get("u") or e.get("source")
            v = e.get("v") or e.get("target")
            w = int(e.get("weight", 1))
            vertices.add(u)
            vertices.add(v)
            if u not in adj: adj[u] = []
            if v not in adj: adj[v] = []
            adj[u].append((v, w))
            adj[v].append((u, w))
            edge_key = (min(u, v), max(u, v))
            edge_weights[edge_key] = min(edge_weights.get(edge_key, w), w)
    elif isinstance(graph, dict):
        for u, neighbors in graph.items():
            vertices.add(u)
            if u not in adj: adj[u] = []
            if isinstance(neighbors, dict):
                for v, w in neighbors.items():
                    vertices.add(v)
                    if v not in adj: adj[v] = []
                    adj[u].append((v, int(w)))
                    adj[v].append((u, int(w)))
                    edge_key = (min(u, v), max(u, v))
                    edge_weights[edge_key] = min(edge_weights.get(edge_key, int(w)), int(w))
            elif isinstance(neighbors, list):
                for item in neighbors:
                    if isinstance(item, dict):
                        v = item.get("node")
                        w = int(item.get("weight", 1))
                    elif isinstance(item, (list, tuple)) and len(item) >= 2:
                        v, w = item[0], int(item[1])
                    else:
                        v, w = str(item), 1
                    vertices.add(v)
                    if v not in adj: adj[v] = []
                    adj[u].append((v, w))
                    adj[v].append((u, w))
                    edge_key = (min(u, v), max(u, v))
                    edge_weights[edge_key] = min(edge_weights.get(edge_key, w), w)

    sorted_vertices = sorted(list(vertices))
    if not sorted_vertices:
        return []

    r = start_node if start_node in vertices else sorted_vertices[0]

    keys = {v: float('inf') for v in sorted_vertices}
    pi = {v: None for v in sorted_vertices}
    keys[r] = 0

    in_queue = set(sorted_vertices)

    def get_pq_state():
        items = []
        for v in in_queue:
            k = keys[v]
            items.append({
                "node": v,
                "key": None if math.isinf(k) else k,
                "key_display": "∞" if math.isinf(k) else str(k),
                "pi": pi[v]
            })
        items.sort(key=lambda x: (float('inf') if x["key"] is None else x["key"], x["node"]))
        return items

    def get_all_keys():
        return {v: ("∞" if math.isinf(keys[v]) else str(keys[v])) for v in sorted_vertices}

    mst_edges = []
    rejected_edges = []
    total_weight = 0

    animation_steps.append({
        "action": "init",
        "line": 5,
        "start_node": r,
        "pq": get_pq_state(),
        "keys": get_all_keys(),
        "predecessors": dict(pi),
        "mst_edges": [],
        "rejected_edges": [],
        "total_weight": 0
    })

    while in_queue:
        u = min(in_queue, key=lambda v: (keys[v], v))
        in_queue.remove(u)

        if pi[u] is not None:
            w_u_pi = edge_weights.get((min(u, pi[u]), max(u, pi[u])), keys[u])
            mst_edges.append({"u": pi[u], "v": u, "weight": w_u_pi})
            total_weight += w_u_pi

        animation_steps.append({
            "action": "extract_min",
            "u": u,
            "pi": pi[u],
            "key": keys[u],
            "line": 7,
            "pq": get_pq_state(),
            "keys": get_all_keys(),
            "predecessors": dict(pi),
            "mst_edges": list(mst_edges),
            "rejected_edges": list(rejected_edges),
            "total_weight": total_weight
        })

        neighbors = sorted(adj.get(u, []), key=lambda item: (item[1], item[0]))
        for v, weight in neighbors:
            animation_steps.append({
                "action": "check_neighbor",
                "u": u,
                "v": v,
                "weight": weight,
                "v_in_q": v in in_queue,
                "current_key": "∞" if math.isinf(keys[v]) else str(keys[v]),
                "line": 9,
                "pq": get_pq_state(),
                "keys": get_all_keys(),
                "predecessors": dict(pi),
                "mst_edges": list(mst_edges),
                "rejected_edges": list(rejected_edges),
                "total_weight": total_weight
            })

            if v in in_queue and weight < keys[v]:
                pi[v] = u
                keys[v] = weight

                animation_steps.append({
                    "action": "decrease_key",
                    "u": u,
                    "v": v,
                    "weight": weight,
                    "line": 11,
                    "pq": get_pq_state(),
                    "keys": get_all_keys(),
                    "predecessors": dict(pi),
                    "mst_edges": list(mst_edges),
                    "rejected_edges": list(rejected_edges),
                    "total_weight": total_weight
                })
            else:
                reason = "not_in_q" if v not in in_queue else "weight_not_smaller"
                mst_set = {(min(e["u"], e["v"]), max(e["u"], e["v"])) for e in mst_edges}
                cand = (min(u, v), max(u, v))
                is_cycle_edge = (v not in in_queue) and (cand not in mst_set) and (v != pi[u]) and (u != pi.get(v))
                if is_cycle_edge:
                    cand_dict = {"u": cand[0], "v": cand[1]}
                    if cand_dict not in rejected_edges:
                        rejected_edges.append(cand_dict)
                animation_steps.append({
                    "action": "skip_neighbor",
                    "u": u,
                    "v": v,
                    "weight": weight,
                    "reason": reason,
                    "line": 9,
                    "pq": get_pq_state(),
                    "keys": get_all_keys(),
                    "predecessors": dict(pi),
                    "mst_edges": list(mst_edges),
                    "rejected_edges": list(rejected_edges),
                    "total_weight": total_weight
                })

    mst_set = {(min(e["u"], e["v"]), max(e["u"], e["v"])) for e in mst_edges}
    for (u_e, v_e) in edge_weights.keys():
        if (u_e, v_e) not in mst_set:
            cand = {"u": u_e, "v": v_e}
            if cand not in rejected_edges:
                rejected_edges.append(cand)

    animation_steps.append({
        "action": "finish",
        "line": 6,
        "pq": [],
        "keys": get_all_keys(),
        "predecessors": dict(pi),
        "mst_edges": list(mst_edges),
        "rejected_edges": list(rejected_edges),
        "total_weight": total_weight
    })

    return animation_steps