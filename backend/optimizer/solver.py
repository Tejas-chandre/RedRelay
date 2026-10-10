
import sys
import json
import math
import pulp


def solve_milp():
    try:
        # 1. Read JSON payload from Node.js
        input_data = sys.stdin.read().strip()

        if not input_data:
            raise ValueError("No JSON input received from Node.js")

        data = json.loads(input_data)

        required_units = int(data.get("required_units", 0))
        supply_nodes = data.get("supply_nodes", {})

        if required_units <= 0:
            raise ValueError("required_units must be greater than zero")

        if not isinstance(supply_nodes, dict):
            raise ValueError("supply_nodes must be a JSON object")

        # 2. Create the optimization problem
        prob = pulp.LpProblem(
            "Blood_Redistribution_Mesh",
            pulp.LpMinimize
        )

        routes = {}
        distances = {}
        max_stocks = {}

        # 3. Create a decision variable for each supply node
        for i, (h_id, info) in enumerate(supply_nodes.items()):
            if not isinstance(info, dict):
                continue

            try:
                raw_stock = info.get(
                    "available_inventory",
                    info.get("units", 0)
                )

                stock_value = float(raw_stock)

                if not math.isfinite(stock_value) or stock_value < 0:
                    continue

                max_stock = math.floor(stock_value)

            except (ValueError, TypeError, OverflowError):
                continue

            try:
                distance = float(info.get("distance_km", 0))

                if not math.isfinite(distance) or distance < 0:
                    distance = 0.0

            except (ValueError, TypeError, OverflowError):
                distance = 0.0

            max_stocks[h_id] = max_stock
            distances[h_id] = distance

            routes[h_id] = pulp.LpVariable(
              
                name=f"route_node_{i}",
                lowBound=0,
               
                upBound=max_stock,
          
                cat=pulp.LpInteger
            )

        # 4. Ensure the total supply meets the requested units
        if not routes or sum(max_stocks.values()) < required_units:
            print(json.dumps({
                "status": "Infeasible",
                "message": "Insufficient available inventory",
                "required_units": required_units,
                "available_units": sum(max_stocks.values()),
                "transfers": []
            }))
            return

        # 5. Minimize total distance-weighted transfer cost
        prob += pulp.lpSum(
            distances[h_id] * routes[h_id]
            for h_id in routes
        ), "Total_Transfer_Distance_Cost"

        # Fulfil exactly the requested number of units
        prob += (
            pulp.lpSum(routes.values()) == required_units,
            "Required_Blood_Units"
        )

        # 6. Run the optimization solver
        solver = pulp.PULP_CBC_CMD(msg=False)
        prob.solve(solver)

        status = pulp.LpStatus[prob.status]

        if status != "Optimal":
            print(json.dumps({
                "status": status,
                "message": "No optimal redistribution plan was found",
                "transfers": []
            }))
            return

        # 7. Read results only AFTER solving
        transfers = []

        for h_id, variable in routes.items():
            units_to_take = variable.varValue

            if units_to_take is not None and units_to_take > 0:
                transfers.append({
                    "from": h_id,
                    "units": int(round(units_to_take)),
                    "distance_km": distances[h_id]
                })

        result = {
            "status": status,
            "required_units": required_units,
            "total_cost": round(float(pulp.value(prob.objective) or 0), 2),
            "transfers": transfers
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            "status": "Error",
            "message": str(e),
            "transfers": []
        }))
        sys.exit(1)


if __name__ == "__main__":
    solve_milp()