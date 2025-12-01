use starknet::ContractAddress;
use starknet::get_caller_address;

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState,
        from: ContractAddress,
        to: ContractAddress,
        amount: u256
    ) -> bool;
    fn transfer(
        ref self: TContractState,
        to: ContractAddress,
        amount: u256
    ) -> bool;
    fn mint(
        ref self: TContractState,
        to: ContractAddress,
        amount: u256
    );
    fn burn(
        ref self: TContractState,
        from: ContractAddress,
        amount: u256
    );
}

#[starknet::interface]
trait IProtocolConfig<TContractState> {
    fn get_fee_config(self: @TContractState) -> (u16, ContractAddress);
}

#[starknet::contract]
mod BondingCurvePool {
    use super::{
        ContractAddress, get_caller_address,
        IERC20Dispatcher, IERC20DispatcherTrait, IProtocolConfigDispatcher, IProtocolConfigDispatcherTrait
    };
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        token: ContractAddress,
        quote_token: ContractAddress,
        creator: ContractAddress,
        protocol_config: ContractAddress,
        base_price: u256,
        slope: u256,
        max_supply: u256,
        tokens_sold: u256,
        reserve_balance: u256,
        migrated: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Buy: Buy,
        Sell: Sell,
        Migrated: Migrated,
    }

    #[derive(Drop, starknet::Event)]
    struct Buy {
        #[key]
        buyer: ContractAddress,
        amount_tokens: u256,
        cost_quote: u256,
        fee_quote: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Sell {
        #[key]
        seller: ContractAddress,
        amount_tokens: u256,
        refund_quote: u256,
        fee_quote: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Migrated {
        #[key]
        pool: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        token: ContractAddress,
        quote_token: ContractAddress,
        creator: ContractAddress,
        protocol_config: ContractAddress,
        base_price: u256,
        slope: u256,
        max_supply: u256
    ) {
        self.token.write(token);
        self.quote_token.write(quote_token);
        self.creator.write(creator);
        self.protocol_config.write(protocol_config);
        self.base_price.write(base_price);
        self.slope.write(slope);
        self.max_supply.write(max_supply);
        self.tokens_sold.write(0);
        self.reserve_balance.write(0);
        self.migrated.write(false);
    }

    // Basic linear price: base + slope * tokens_sold
    
    fn current_price(self: @ContractState) -> u256 {
        let base = self.base_price.read();
        let slope = self.slope.read();
        let sold = self.tokens_sold.read();
        base + (slope * sold)
    }

    
    fn get_state(
        self: @ContractState
    ) -> (ContractAddress, ContractAddress, u256, u256, bool) {
        (
            self.token.read(),
            self.quote_token.read(),
            self.tokens_sold.read(),
            self.reserve_balance.read(),
            self.migrated.read()
        )
    }

    
    fn get_current_price(self: @ContractState) -> u256 {
        self.current_price()
    }

    
    fn token(self: @ContractState) -> ContractAddress {
        self.token.read()
    }

    
    fn quote_token(self: @ContractState) -> ContractAddress {
        self.quote_token.read()
    }

    
    fn creator(self: @ContractState) -> ContractAddress {
        self.creator.read()
    }

    
    fn base_price(self: @ContractState) -> u256 {
        self.base_price.read()
    }

    
    fn slope(self: @ContractState) -> u256 {
        self.slope.read()
    }

    
    fn max_supply(self: @ContractState) -> u256 {
        self.max_supply.read()
    }

    
    fn tokens_sold(self: @ContractState) -> u256 {
        self.tokens_sold.read()
    }

    
    fn reserve_balance(self: @ContractState) -> u256 {
        self.reserve_balance.read()
    }

    
    fn migrated(self: @ContractState) -> bool {
        self.migrated.read()
    }

    // ----- BUY -----
    #[external(v0)]
    fn buy(
        ref self: ContractState,
        amount_tokens: u256
    ) {
        let caller = get_caller_address();
        let migrated = self.migrated.read();
        assert(!migrated, 'ALREADY_MIGRATED');
        let max_supply = self.max_supply.read();
        let sold = self.tokens_sold.read();
        assert(sold + amount_tokens <= max_supply, 'MAX_SUPPLY_REACHED');
        let price = self.current_price();
        let total_cost = price * amount_tokens; // simplified

        // protocol fee
        let proto_addr = self.protocol_config.read();
        let proto = IProtocolConfigDispatcher { contract_address: proto_addr };
        let (fee_bps, fee_receiver) = proto.get_fee_config();
        let fee = (total_cost * fee_bps.into()) / 10000;
        let net_cost = total_cost - fee;

        let quote_addr = self.quote_token.read();
        let mut quote = IERC20Dispatcher { contract_address: quote_addr };
        let pool_addr = starknet::get_contract_address();

        // transfer quote from buyer to this pool
        quote.transfer_from(caller, pool_addr, net_cost);

        // transfer fee to protocol
        quote.transfer_from(caller, fee_receiver, fee);

        // mint tokens to buyer
        let token_addr = self.token.read();
        let mut token = IERC20Dispatcher { contract_address: token_addr };
        token.mint(caller, amount_tokens);

        self.tokens_sold.write(sold + amount_tokens);
        let reserve = self.reserve_balance.read();
        self.reserve_balance.write(reserve + net_cost);

        self.emit(Buy { 
            buyer: caller, 
            amount_tokens, 
            cost_quote: total_cost, 
            fee_quote: fee 
        });
    }

    // ----- SELL (optional in MVP – you can disable it) -----
    #[external(v0)]
    fn sell(
        ref self: ContractState,
        amount_tokens: u256
    ) {
        let caller = get_caller_address();
        let migrated = self.migrated.read();
        assert(!migrated, 'ALREADY_MIGRATED');
        let sold = self.tokens_sold.read();
        assert(sold >= amount_tokens, 'NOT_ENOUGH_SOLD');
        let price = self.current_price();
        let gross_refund = price * amount_tokens;

        // protocol fee
        let proto_addr = self.protocol_config.read();
        let proto = IProtocolConfigDispatcher { contract_address: proto_addr };
        let (fee_bps, fee_receiver) = proto.get_fee_config();
        let fee = (gross_refund * fee_bps.into()) / 10000;
        let net_refund = gross_refund - fee;

        let reserve = self.reserve_balance.read();
        assert(reserve >= net_refund, 'INSUFFICIENT_RESERVE');

        // burn tokens from seller
        let token_addr = self.token.read();
        let mut token = IERC20Dispatcher { contract_address: token_addr };
        token.burn(caller, amount_tokens);

        let quote_addr = self.quote_token.read();
        let mut quote = IERC20Dispatcher { contract_address: quote_addr };

        // send refund
        quote.transfer(caller, net_refund);

        // send fee
        quote.transfer(fee_receiver, fee);

        self.tokens_sold.write(sold - amount_tokens);
        self.reserve_balance.write(reserve - net_refund);

        self.emit(Sell { 
            seller: caller, 
            amount_tokens, 
            refund_quote: net_refund, 
            fee_quote: fee 
        });
    }

    // Migration hook (callable only by LiquidityMigration later)
    #[external(v0)]
    fn set_migrated(
        ref self: ContractState
    ) {
        let caller = get_caller_address();
        // TODO in real version: store allowed migration contract & check
        // For PoC, trust a fixed caller or factory
        self.migrated.write(true);
        self.emit(Migrated { pool: starknet::get_contract_address() });
    }
}

// Main library file - exports all contracts

mod memecoin_token;
mod protocol_config;
mod bonding_curve_pool;
mod pump_factory;
mod liquidity_migration;

use starknet::ContractAddress;
use starknet::get_caller_address;

#[starknet::interface]
trait IBondingCurvePool<TContractState> {
    fn set_migrated(ref self: TContractState);
}

#[starknet::interface]
trait IFactory<TContractState> {
    fn mark_migrated(ref self: TContractState, launch_id: u256);
}

#[starknet::contract]
mod LiquidityMigration {
    use super::{
        ContractAddress,
        get_caller_address,
        IBondingCurvePoolDispatcher, IBondingCurvePoolDispatcherTrait,
        IFactoryDispatcher, IFactoryDispatcherTrait
    };
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        factory: ContractAddress,
        // later: router, LP token, lock rules, etc.
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        MigrationCompleted: MigrationCompleted,
    }

    #[derive(Drop, starknet::Event)]
    struct MigrationCompleted {
        #[key]
        launch_id: u256,
        #[key]
        pool: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        factory: ContractAddress
    ) {
        self.owner.write(owner);
        self.factory.write(factory);
    }

    
    fn owner(self: @ContractState) -> ContractAddress {
        self.owner.read()
    }

    
    fn factory(self: @ContractState) -> ContractAddress {
        self.factory.read()
    }

    #[external(v0)]
    fn migrate_stub(
        ref self: ContractState,
        launch_id: u256,
        pool_addr: ContractAddress
    ) {
        let caller = get_caller_address();
        let owner = self.owner.read();
        assert(caller == owner, 'ONLY_OWNER');
        // In future: pull reserves, call DEX, lock LP
        // For PoC: just mark migrated
        let mut pool = IBondingCurvePoolDispatcher { contract_address: pool_addr };
        pool.set_migrated();

        let factory_addr = self.factory.read();
        let mut factory = IFactoryDispatcher { contract_address: factory_addr };
        factory.mark_migrated(launch_id);

        self.emit(MigrationCompleted { launch_id, pool: pool_addr });
    }
}

use starknet::ContractAddress;
use starknet::get_caller_address;

#[starknet::contract]
mod MemecoinToken {
    use super::{ContractAddress, get_caller_address};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess
    };

    #[storage]
    struct Storage {
        name: felt252,
        symbol: felt252,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
        minter: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    struct Transfer {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        value: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Approval {
        #[key]
        owner: ContractAddress,
        #[key]
        spender: ContractAddress,
        value: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: felt252,
        symbol: felt252,
        decimals: u8,
        initial_minter: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.minter.write(initial_minter);
        self.total_supply.write(0);
    }

    // Views
    
    fn name(self: @ContractState) -> felt252 { 
        self.name.read() 
    }

    
    fn symbol(self: @ContractState) -> felt252 { 
        self.symbol.read() 
    }

    
    fn decimals(self: @ContractState) -> u8 { 
        self.decimals.read() 
    }

    
    fn total_supply(self: @ContractState) -> u256 { 
        self.total_supply.read() 
    }

    
    fn balance_of(self: @ContractState, owner: ContractAddress) -> u256 {
        self.balances.read(owner)
    }

    
    fn allowance(
        self: @ContractState,
        owner: ContractAddress,
        spender: ContractAddress
    ) -> u256 {
        self.allowances.read((owner, spender))
    }

    
    fn minter(self: @ContractState) -> ContractAddress {
        self.minter.read()
    }

    // Transfers
    #[external(v0)]
    fn transfer(
        ref self: ContractState,
        to: ContractAddress,
        amount: u256
    ) -> bool {
        let from = get_caller_address();
        _transfer(ref self, from, to, amount);
        true
    }

    #[external(v0)]
    fn approve(
        ref self: ContractState,
        spender: ContractAddress,
        amount: u256
    ) -> bool {
        let owner = get_caller_address();
        self.allowances.write((owner, spender), amount);
        self.emit(Approval { owner, spender, value: amount });
        true
    }

    #[external(v0)]
    fn transfer_from(
        ref self: ContractState,
        from: ContractAddress,
        to: ContractAddress,
        amount: u256
    ) -> bool {
        let caller = get_caller_address();
        let allowed = self.allowances.read((from, caller));
        assert(allowed >= amount, 'NOT_ALLOWED');
        self.allowances.write((from, caller), allowed - amount);
        _transfer(ref self, from, to, amount);
        true
    }

    fn _transfer(
        ref self: ContractState,
        from: ContractAddress,
        to: ContractAddress,
        amount: u256
    ) {
        let from_bal = self.balances.read(from);
        assert(from_bal >= amount, 'INSUFFICIENT_BALANCE');
        self.balances.write(from, from_bal - amount);
        let to_bal = self.balances.read(to);
        self.balances.write(to, to_bal + amount);
        self.emit(Transfer { from, to, value: amount });
    }

    // Mint / Burn – only minter (BondingCurvePool)
    #[external(v0)]
    fn mint(
        ref self: ContractState,
        to: ContractAddress,
        amount: u256
    ) {
        let caller = get_caller_address();
        let minter = self.minter.read();
        assert(caller == minter, 'NOT_MINTER');
        let total = self.total_supply.read();
        self.total_supply.write(total + amount);
        let bal = self.balances.read(to);
        self.balances.write(to, bal + amount);
        let zero_address = starknet::contract_address_const::<0>();
        self.emit(Transfer { 
            from: zero_address, 
            to, 
            value: amount 
        });
    }

    #[external(v0)]
    fn burn(
        ref self: ContractState,
        from: ContractAddress,
        amount: u256
    ) {
        let caller = get_caller_address();
        let minter = self.minter.read();
        assert(caller == minter, 'NOT_MINTER');
        let bal = self.balances.read(from);
        assert(bal >= amount, 'INSUFFICIENT_BALANCE');
        self.balances.write(from, bal - amount);
        let total = self.total_supply.read();
        self.total_supply.write(total - amount);
        let zero_address = starknet::contract_address_const::<0>();
        self.emit(Transfer { 
            from, 
            to: zero_address, 
            value: amount 
        });
    }

    #[external(v0)]
    fn update_minter(
        ref self: ContractState,
        new_minter: ContractAddress
    ) {
        let caller = get_caller_address();
        let current_minter = self.minter.read();
        assert(caller == current_minter, 'ONLY_CURRENT_MINTER');
        self.minter.write(new_minter);
    }
}

use starknet::ContractAddress;
use starknet::get_caller_address;

#[starknet::contract]
mod ProtocolConfig {
    use super::{ContractAddress, get_caller_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        fee_bps: u16,          // e.g. 300 = 3%
        fee_receiver: ContractAddress,
        min_base_price: u256,
        max_base_price: u256,
        min_slope: u256,
        max_slope: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        FeeConfigUpdated: FeeConfigUpdated,
        CurveLimitsUpdated: CurveLimitsUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct FeeConfigUpdated {
        fee_bps: u16,
        fee_receiver: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct CurveLimitsUpdated {
        min_base_price: u256,
        max_base_price: u256,
        min_slope: u256,
        max_slope: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        fee_bps: u16,
        fee_receiver: ContractAddress
    ) {
        self.owner.write(owner);
        self.fee_bps.write(fee_bps);
        self.fee_receiver.write(fee_receiver);
        self.min_base_price.write(0);
        self.max_base_price.write(10000000); // dummy
        self.min_slope.write(1);
        self.max_slope.write(10000000);
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let owner = self.owner.read();
        assert(caller == owner, 'ONLY_OWNER');
    }

    
    fn owner(self: @ContractState) -> ContractAddress {
        self.owner.read()
    }

    
    fn get_fee_config(self: @ContractState) -> (u16, ContractAddress) {
        (self.fee_bps.read(), self.fee_receiver.read())
    }

    
    fn get_curve_limits(self: @ContractState) -> (u256, u256, u256, u256) {
        (
            self.min_base_price.read(),
            self.max_base_price.read(),
            self.min_slope.read(),
            self.max_slope.read()
        )
    }

    #[external(v0)]
    fn set_fee_config(
        ref self: ContractState,
        fee_bps: u16,
        fee_receiver: ContractAddress
    ) {
        only_owner(@self);
        self.fee_bps.write(fee_bps);
        self.fee_receiver.write(fee_receiver);
        self.emit(FeeConfigUpdated { fee_bps, fee_receiver });
    }

    #[external(v0)]
    fn set_curve_limits(
        ref self: ContractState,
        min_base: u256,
        max_base: u256,
        min_slope: u256,
        max_slope: u256
    ) {
        only_owner(@self);
        self.min_base_price.write(min_base);
        self.max_base_price.write(max_base);
        self.min_slope.write(min_slope);
        self.max_slope.write(max_slope);
        self.emit(CurveLimitsUpdated { 
            min_base_price: min_base,
            max_base_price: max_base,
            min_slope,
            max_slope
        });
    }
}

use starknet::ContractAddress;
use starknet::get_caller_address;

#[derive(Copy, Drop, Serde, starknet::Store)]
struct LaunchInfo {
    token: ContractAddress,
    pool: ContractAddress,
    creator: ContractAddress,
    name: felt252,
    symbol: felt252,
    base_price: u256,
    slope: u256,
    max_supply: u256,
    migrated: bool,
}

#[starknet::contract]
mod PumpFactory {
    use super::{ContractAddress, get_caller_address, LaunchInfo};
    use starknet::storage::{
        StoragePointerReadAccess, StoragePointerWriteAccess,
        StorageMapReadAccess, StorageMapWriteAccess
    };

    #[storage]
    struct Storage {
        launches: Map<u256, LaunchInfo>,
        launch_count: u256,
        owner: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        LaunchRegistered: LaunchRegistered,
        LaunchMigrated: LaunchMigrated,
    }

    #[derive(Drop, starknet::Event)]
    struct LaunchRegistered {
        #[key]
        launch_id: u256,
        token: ContractAddress,
        pool: ContractAddress,
        creator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct LaunchMigrated {
        #[key]
        launch_id: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.launch_count.write(0);
    }

    
    fn owner(self: @ContractState) -> ContractAddress {
        self.owner.read()
    }

    
    fn total_launches(self: @ContractState) -> u256 {
        self.launch_count.read()
    }

    
    fn get_launch(
        self: @ContractState,
        launch_id: u256
    ) -> LaunchInfo {
        self.launches.read(launch_id)
    }

    // For PoC: called by off-chain script after deploying MemecoinToken + BondingCurvePool
    #[external(v0)]
    fn register_launch(
        ref self: ContractState,
        token: ContractAddress,
        pool: ContractAddress,
        name: felt252,
        symbol: felt252,
        base_price: u256,
        slope: u256,
        max_supply: u256
    ) -> u256 {
        let creator = get_caller_address();
        let id = self.launch_count.read();
        let info = LaunchInfo {
            token,
            pool,
            creator,
            name,
            symbol,
            base_price,
            slope,
            max_supply,
            migrated: false,
        };
        self.launches.write(id, info);
        self.launch_count.write(id + 1);
        self.emit(LaunchRegistered { launch_id: id, token, pool, creator });
        id
    }

    // Called by LiquidityMigration later
    #[external(v0)]
    fn mark_migrated(
        ref self: ContractState,
        launch_id: u256
    ) {
        let caller = get_caller_address();
        // TODO: restrict to LiquidityMigration contract in prod
        let mut info = self.launches.read(launch_id);
        let mut updated_info = LaunchInfo {
            token: info.token,
            pool: info.pool,
            creator: info.creator,
            name: info.name,
            symbol: info.symbol,
            base_price: info.base_price,
            slope: info.slope,
            max_supply: info.max_supply,
            migrated: true,
        };
        self.launches.write(launch_id, updated_info);
        self.emit(LaunchMigrated { launch_id });
    }
}

